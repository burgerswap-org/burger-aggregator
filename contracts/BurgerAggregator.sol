// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;
pragma experimental ABIEncoderV2;

import './modules/Configable.sol';
import './modules/Multicall.sol';
import './modules/Common.sol';

import "./interfaces/IBurgerAggregator.sol";
import "./interfaces/IBurgerDexManager.sol";
import "./interfaces/IDexProtocal.sol";
import "./interfaces/IWETH.sol";
import "./interfaces/IBurgerSwapReward.sol";
import "./libraries/UniversalERC20.sol";
import "./libraries/BalancerLib.sol";
import "./libraries/DisableFlags.sol";
import "./libraries/Distribution.sol";


contract BurgerAggregator is Common, Configable, Multicall, IBurgerAggregator {
    using SafeMath for uint256;
    using DisableFlags for uint256;
    using UniversalERC20 for IERC20;

    IBurgerDexManager public dexManager;
    IBurgerSwapReward public swapReward;

    event Swap(address swaper, address fromToken, address destToken, uint256 amount, uint256 returnAmount);

    constructor(address _weth) public {
        owner = msg.sender;
        weth = _weth;
    }

    function configure(IBurgerDexManager _burgerDexManager, IBurgerSwapReward _swapReward, address _burgerPlatform, uint256 _fee) external onlyDev {
        dexManager = _burgerDexManager;
        swapReward = _swapReward;
        burgerPlatform = _burgerPlatform;
        fee = _fee;
    }

    receive() external payable {
    }

    function setSwapReward(IBurgerSwapReward _swapReward) external onlyDev {
        swapReward = _swapReward;
    }

    function setFee(uint256 _fee) external onlyDev {
        fee = _fee;
    }

    function addReward(address _user, address _tokenIn, address _tokenOut, uint _amountIn, uint _amountOut) internal returns (uint) {
        if(address(swapReward) != address(0)) {
            return swapReward.addReward(_user, _tokenIn, _tokenOut, _amountIn, _amountOut);
        }
        return 0;
    }

    function getAllReserves(uint256 flags, uint dexsCount) public override view returns (Dex[] memory reserves) {
        reserves = new Dex[](dexsCount);
        for (uint256 i = 0; i < dexsCount; i++) {
            (address protocol, address dex, uint256 disFlag,) = dexManager.dexs(i);
            if (flags.check(disFlag)) {
                reserves[i] = Dex({
                    protocal: address(0),
                    dex: address(0),
                    skip: true
                });
            } else {
               reserves[i] = Dex({
                    protocal: protocol,
                    dex: dex,
                    skip: false
                });
            }
        }
    }

    function getExpectedReturn(
        IERC20 fromToken,
        IERC20 destToken,
        uint256 amount,
        uint256 parts,
        uint256 flags
    ) external override view returns (uint256 returnAmount, uint256[] memory distribution) {
        (returnAmount, , distribution) = _getExpectedReturnWithGas(
            fromToken,
            destToken,
            amount,
            parts,
            flags,
            0
        );
    }

    function getExpectedReturnWithGas(
        IERC20 fromToken,
        IERC20 destToken,
        uint256 amount,
        uint256 parts,
        uint256 flags,
        uint256 destTokenEthPriceTimesGasPrice
    ) public override view returns (uint256 returnAmount, uint256 feeAmount, uint256 estimateGasAmount, uint256[] memory distribution){
        if (fromToken == destToken || (fromToken.isETH() && destToken.isETH())) {
            return (returnAmount, feeAmount, estimateGasAmount, new uint256[](dexManager.dexLength()));
        }
        (returnAmount, estimateGasAmount, distribution) = _getExpectedReturnWithGas(fromToken, destToken, amount, parts, flags, destTokenEthPriceTimesGasPrice);
        feeAmount = returnAmount.mul(fee).div(1e4);
        returnAmount = returnAmount.sub(feeAmount);
    }

    function getExpectedReturnWithGasMulti(
        IERC20[] calldata tokens,
        uint256 amount,
        uint256[] calldata parts,
        uint256[] calldata flags,
        uint256[] calldata destTokenEthPriceTimesGasPrices
    )
        external
        override
        view
        returns(
            uint256[] memory returnAmounts,
            uint256 feeAmount,
            uint256 estimateGasAmount,
            uint256[] memory distribution
        )
    {
        require(tokens.length - 1 == parts.length && parts.length == flags.length && flags.length == destTokenEthPriceTimesGasPrices.length, 'Invalid args');

        GetReturnMutilState memory state = GetReturnMutilState({
            tokens: tokens,
            amount: amount,
            parts: parts,
            flags: flags,
            destTokenEthPriceTimesGasPrices: destTokenEthPriceTimesGasPrices,
            dist: new uint256[](0)
        });
        if (state.tokens[0] == state.tokens[state.tokens.length - 1] || (state.tokens[0].isETH() && state.tokens[state.tokens.length - 1].isETH())) {
            return (new uint256[](state.tokens.length - 1), feeAmount, estimateGasAmount, new uint256[](dexManager.dexLength()));
        }

        returnAmounts = new uint256[](state.tokens.length - 1);
        for (uint i = 1; i < state.tokens.length; i++) {
            if (state.tokens[i - 1] == state.tokens[i]) {
                returnAmounts[i - 1] = (i == 1) ? state.amount : returnAmounts[i - 2];
                // returnAmounts[i - 1] = 0;
                continue;
            }

            (
                returnAmounts[i - 1],
                state.amount,
                state.dist
            ) = _getExpectedReturnWithGas(
                state.tokens[i - 1],
                state.tokens[i],
                (i == 1) ? state.amount : returnAmounts[i - 2],
                state.parts[i - 1],
                state.flags[i - 1],
                state.destTokenEthPriceTimesGasPrices[i - 1]
            );
            estimateGasAmount = estimateGasAmount.add(state.amount);

            if (distribution.length == 0) {
                distribution = new uint256[](state.dist.length);
            }
            for (uint j = 0; j < distribution.length; j++) {
                distribution[j] = distribution[j].add(state.dist[j] << (8 * (i - 1)));
            }
        }
        feeAmount = returnAmounts[state.tokens.length - 2].mul(fee).div(1e4);
        returnAmounts[state.tokens.length - 2] = returnAmounts[state.tokens.length - 2].sub(feeAmount);
    }

    function swap(
        IERC20 fromToken,
        IERC20 destToken,
        uint256 amount,
        uint256 minReturn,
        uint256[] calldata distribution,
        uint256 flags
    ) public payable override returns (uint256 returnAmount) {
        require(fromToken != destToken && !(fromToken.isETH() && destToken.isETH()), "Same token"); 

        fromToken.universalTransferFrom(msg.sender, address(this), amount);
        if (address(destToken) == address(0)) {
            returnAmount = _swap(fromToken, IERC20(weth), amount, distribution, flags);
        } else {
            returnAmount = _swap(fromToken, destToken, amount, distribution, flags);
        }
    
        uint256 feeAmount = returnAmount.mul(fee).div(1e4);
        require(returnAmount.sub(feeAmount) >= minReturn, "Less than minReturn");
        
        if (address(destToken) == address(0)) {
            IERC20(weth).universalTransfer(team(), feeAmount);
            IWETH(weth).withdraw(returnAmount.sub(feeAmount));
            destToken.universalTransfer(msg.sender, returnAmount.sub(feeAmount));
        } else {
            destToken.universalTransfer(team(), feeAmount);
            destToken.universalTransfer(msg.sender, returnAmount.sub(feeAmount));
        }

        addReward(msg.sender, address(fromToken), address(destToken), amount, returnAmount);
        emit Swap(msg.sender, address(fromToken), address(destToken), amount, returnAmount);
    }

    function swapMulti(
        IERC20[] calldata tokens,
        uint256 amount,
        uint256 minReturn,
        uint256[] calldata distribution,
        uint256[] calldata flags
    ) public override payable returns(uint256 returnAmount) {
        require(tokens.length - 1 == flags.length, 'Invalid args length');
        require(distribution.length == dexManager.dexLength(), 'Invalid distribution');
        require(tokens[0] != tokens[tokens.length - 1] && !(tokens[0].isETH() && tokens[tokens.length - 1].isETH()), "Same token");

        tokens[0].universalTransferFrom(msg.sender, address(this), amount);

        returnAmount = amount;

        for (uint i = 1; i < tokens.length; i++) {
            if (tokens[i - 1] == tokens[i]) {
                continue;
            }

            uint256[] memory dist = new uint256[](distribution.length);
            for (uint j = 0; j < distribution.length; j++) {
                dist[j] = (distribution[j] >> (8 * (i - 1))) & 0xFF;
            }

            if (i == (tokens.length - 1) && address(tokens[tokens.length - 1]) == address(0)) {
                _swap(tokens[i - 1], IERC20(weth), returnAmount, dist, flags[i - 1]);
                returnAmount = IERC20(weth).universalBalanceOf(address(this));
            } else {
                _swap(tokens[i - 1], tokens[i], returnAmount, dist, flags[i - 1]);
                returnAmount = tokens[i].universalBalanceOf(address(this));
            }
        }

        uint256 feeAmount = returnAmount.mul(fee).div(1e4);
        require(returnAmount.sub(feeAmount) >= minReturn, "Less than minReturn");
        if (address(tokens[tokens.length - 1]) == address(0)) {
            IERC20(weth).universalTransfer(team(), feeAmount);
            IWETH(weth).withdraw(returnAmount.sub(feeAmount));
            tokens[tokens.length - 1].universalTransfer(msg.sender, returnAmount.sub(feeAmount));
        } else {
            tokens[tokens.length - 1].universalTransfer(team(), feeAmount);
            tokens[tokens.length - 1].universalTransfer(msg.sender, returnAmount.sub(feeAmount));
        }

        addReward(msg.sender, address(tokens[0]), address(tokens[tokens.length - 1]), amount, returnAmount);
        emit Swap(msg.sender, address(tokens[0]), address(tokens[tokens.length - 1]), amount, returnAmount);
    }

    function _getExpectedReturnWithGas(
        IERC20 fromToken,
        IERC20 destToken,
        uint256 amount,
        uint256 parts,
        uint256 flags,
        uint256 destTokenEthPriceTimesGasPrice
    ) internal view returns (uint256 returnAmount, uint256 estimateGasAmount, uint256[] memory distribution){

        Args memory args;
        {
            args.fromToken = fromToken;
            args.destToken = destToken;
            args.amount = amount;
            args.parts = parts;
            args.flags = flags;
            args.destTokenEthPriceTimesGasPrice = destTokenEthPriceTimesGasPrice;
            args.dexsCount = dexManager.dexLength();
            args.distribution = new uint256[](args.dexsCount);
        }
        args.reserves = getAllReserves(args.flags, args.dexsCount);
        args.matrix = new int256[][](args.dexsCount);
        args.gases = new uint256[](args.dexsCount);
        bool atLeastOnePositive = false;
        
        for (uint256 i = 0; i < args.dexsCount; i++) {
            uint256[] memory rets;
            if (args.reserves[i].skip) {
                (rets, args.gases[i]) = (new uint256[](args.parts), 0);
            } else {
                (rets, args.gases[i]) = IDexProtocal(
                    args.reserves[i].protocal
                ).calculateOnDex(
                    args.reserves[i].dex,
                    args.fromToken,
                    args.destToken,
                    Distribution._linearInterpolation(args.amount, args.parts)
                );
            }
            // Prepend zero and sub gas
            int256 gas = int256(args.gases[i].mul(args.destTokenEthPriceTimesGasPrice).div(1e18));
            args.matrix[i] = new int256[](args.parts + 1);
            for (uint256 j = 0; j < rets.length; j++) {
                args.matrix[i][j + 1] = int256(rets[j]) - gas;
                atLeastOnePositive = atLeastOnePositive || (args.matrix[i][j + 1] > 0);
            }
        }

        if (!atLeastOnePositive) {
            for (uint256 i = 0; i < args.dexsCount; i++) {
                for (uint256 j = 1; j < args.parts + 1; j++) {
                    if (args.matrix[i][j] == 0) {
                        args.matrix[i][j] = Distribution.VERY_NEGATIVE_VALUE;
                    }
                }
            }
        }

        (, distribution) = Distribution._findBestDistribution(args.parts, args.matrix);
        args.distribution = distribution;
        (returnAmount, estimateGasAmount) = _getReturnAndGasByDistribution(args);
        return (returnAmount, estimateGasAmount, distribution);
    }

    function _getReturnAndGasByDistribution(Args memory args) internal pure returns (uint256 returnAmount, uint256 estimateGasAmount) {
        for (uint256 i = 0; i < args.dexsCount; i++) {
            if (args.distribution[i] > 0) {
                estimateGasAmount = estimateGasAmount.add(args.gases[i]);
                int256 value = args.matrix[i][args.distribution[i]];
                returnAmount = returnAmount.add(
                    uint256((value == Distribution.VERY_NEGATIVE_VALUE ? 0 : value) + int256(args.gases[i].mul(args.destTokenEthPriceTimesGasPrice).div(1e18)))
                );
            }
        }
    }

    function _swap(
        IERC20 fromToken,
        IERC20 destToken,
        uint256 amount,
        uint256[] memory distribution,
        uint256 flags
    ) internal returns(uint256 returnAmount) {
        require(fromToken.universalBalanceOf(address(this)) >= amount, "Wrong of amount");
        SwapState memory state = SwapState({
            reserves: getAllReserves(flags, dexManager.dexLength()),
            parts: 0,
            lastNonZeroIndex: 0,
            remainingAmount: amount
        });
        require(distribution.length == state.reserves.length, "ASDRNM");

        for (uint256 i = 0; i < distribution.length; i++) {
            if (distribution[i] > 0) {
                state.parts = state.parts.add(distribution[i]);
                state.lastNonZeroIndex = i;
            }
        }

        if (state.parts == 0) {
            if (fromToken.isETH()) {
                msg.sender.transfer(msg.value);
                return msg.value;
            }
            return amount;
        }

        for (uint256 i = 0; i < distribution.length; i++) {
            if (distribution[i] == 0) continue;
            uint256 swapAmount = amount.mul(distribution[i]).div(state.parts);
            if (i == state.lastNonZeroIndex) swapAmount = state.remainingAmount;
            state.remainingAmount -= swapAmount;
            // bytes4(keccak256(bytes('swapOnDex(address,address,address,uint256,address)')));
            _siglecall(state.reserves[i].protocal, abi.encodeWithSelector(0xf32a1039, state.reserves[i].dex, address(fromToken), address(destToken), swapAmount, address(this)));
        }

        returnAmount = destToken.universalBalanceOf(address(this));
    }
}
