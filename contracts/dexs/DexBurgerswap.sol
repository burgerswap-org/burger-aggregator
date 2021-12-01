// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;

import '../interfaces/IUniswapV2Factory.sol';
import '../interfaces/IUniswapV2Exchange.sol';
import '../interfaces/IDemaxPlatform.sol';
import '../interfaces/IDexProtocal.sol';
import '../interfaces/IWETH.sol';
import '../libraries/TransferHelper.sol';
import '../libraries/UniversalERC20.sol';
import '../libraries/Sqrt.sol';
import '../modules/Configable.sol';
import '../modules/Common.sol';

contract DexBurgerswap is Common, Configable, IDexProtocal {
    using UniversalERC20 for IERC20;
    using SafeMath for uint256;
    using Sqrt for uint256;


    receive() external payable {}

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, 'EXPIRED');
        _;
    }

    constructor(address _weth) public {
        owner = msg.sender;
        weth = _weth;
    }

    function configure(address _burgerPlatform) external onlyDev {
        burgerPlatform = _burgerPlatform;
    }

    function getTokenPrice(
        address dexAddr,
        IERC20 fromToken,
        IERC20 destToken
    ) external view override returns (uint256 price) {
        IERC20 fromTokenReal = fromToken.isETH() ? IERC20(weth) : fromToken;
        IERC20 destTokenReal = destToken.isETH() ? IERC20(weth) : destToken;
        (uint256 reserve0, uint256 reserve1) = getReserves(dexAddr, address(fromTokenReal), address(destTokenReal));
        if (reserve0 == 0 || reserve1 == 0) return price;
        uint256 fds = fromTokenReal.decimals();
        uint256 dds = destTokenReal.decimals();
        if (fds != dds) {
            uint256 offset = fds > dds ? fds - dds : dds - fds;
            if (fds > dds) {
                reserve1 = reserve1.mul(10**offset);
            } else {
                reserve0 = reserve0.mul(10**offset);
            }
        }
        price = reserve1.mul(10**18).div(reserve0);
    }

    function getLiquidity(
        address dexAddr,
        IERC20 fromToken,
        IERC20 destToken,
        IERC20 connector
    ) external view override returns (uint256 liquidity) {
        (, uint256 weight) = getRate(dexAddr, fromToken, destToken, connector);
        liquidity = weight;
    }

    function getRate(
        address dexAddr,
        IERC20 fromToken,
        IERC20 destToken,
        IERC20 connector
    ) public view override returns (uint256 rate, uint256 weight) {
        IERC20 fromTokenReal = fromToken.isETH() ? IERC20(weth) : fromToken;
        IERC20 destTokenReal = destToken.isETH() ? IERC20(weth) : destToken;
        IERC20 connectorReal = connector.isETH() ? IERC20(weth) : connector;
        uint256 balance0;
        uint256 balance1;
        if (address(connector) == address(0)) {
            (balance0, balance1) = getReserves(dexAddr, address(fromTokenReal), address(destTokenReal));
            if (balance0 == 0 || balance1 == 0) return(rate, weight);
        } else {
            uint256 balanceConnector0;
            uint256 balanceConnector1;
            (balance0, balanceConnector0) = getReserves(dexAddr, address(fromTokenReal), address(connectorReal));
            (balanceConnector1, balance1) = getReserves(dexAddr, address(connectorReal), address(destTokenReal));
            if (balanceConnector0 == 0 || balanceConnector1 == 0) return(rate, weight);
            if (balanceConnector0 > balanceConnector1) {
                balance0 = balance0.mul(balanceConnector1).div(balanceConnector0);
            } else {
                balance1 = balance1.mul(balanceConnector0).div(balanceConnector1);
            }
        }
        rate = balance1.mul(1e18).div(balance0);
        weight = balance0.mul(balance1).sqrt();
    }

    function calculateOnDex(
        address dexAddr,
        IERC20 fromToken,
        IERC20 destToken,
        uint256[] calldata amounts
    ) external view override returns (uint256[] memory rets, uint256 gas) {
        return _calculate(dexAddr, fromToken, destToken, amounts);
    }

    function swapOnDex(
        address dexAddr,
        address fromToken,
        address destToken,
        uint256 amount,
        address to
    ) external payable override {
        _swap(dexAddr, IERC20(fromToken), IERC20(destToken), amount);
        if (to != address(this)) {
            IERC20(destToken).universalTransfer(to, IERC20(destToken).universalBalanceOf(address(this)));
        }
    }

    function _calculate(
        address dexAddr,
        IERC20 fromToken,
        IERC20 destToken,
        uint256[] memory amounts
    ) internal view returns (uint256[] memory rets, uint256 gas) {
        if (fromToken == destToken) return (amounts, 0);
        rets = new uint256[](amounts.length);
        IERC20 fromTokenReal = fromToken.isETH() ? IERC20(weth) : fromToken;
        IERC20 destTokenReal = destToken.isETH() ? IERC20(weth) : destToken;
        address pair = pairFor(dexAddr, address(fromTokenReal), address(destTokenReal));
        if (pair != address(0)) {
            uint256 fromTokenBalance = fromTokenReal.universalBalanceOf(pair);
            uint256 destTokenBalance = destTokenReal.universalBalanceOf(pair);
            for (uint256 i = 0; i < amounts.length; i++) {
                rets[i] = (amounts[i] == 0) ? 0 : IDemaxPlatform(burgerPlatform).getAmountOut(amounts[i], fromTokenBalance, destTokenBalance);
            }
            return (rets, 28_0000);
        }
    }

    function _swap(
        address dexAddr,
        IERC20 fromToken,
        IERC20 destToken,
        uint256 amount
    ) internal {
        if (fromToken.isETH()) {
            IWETH(weth).deposit{value: amount}();
        }

        IERC20 fromTokenReal = fromToken.isETH() ? IERC20(weth) : fromToken;
        IERC20 destTokenReal = destToken.isETH() ? IERC20(weth) : destToken;
        IUniswapV2Exchange exchange = IUniswapV2Exchange(pairFor(dexAddr, address(fromTokenReal), address(destTokenReal)));
        (uint256 returnAmount, bool needSync) = _getReturn(exchange, fromTokenReal, destTokenReal, amount);
        if (needSync) {
            exchange.sync();
        }
        fromTokenReal.universalApprove(burgerPlatform, amount);

        address[] memory path = new address[](2);
        path[0] = address(fromTokenReal);
        path[1] = address(destTokenReal);
        IDemaxPlatform(burgerPlatform).swapExactTokensForTokens(amount, returnAmount, path, address(this), block.timestamp.add(86400));

        if (destToken.isETH()) {
            IWETH(weth).withdraw(IWETH(weth).balanceOf(address(this)));
        }
    }

    function _getReturn(
        IUniswapV2Exchange exchange,
        IERC20 fromToken,
        IERC20 destToken,
        uint256 amountIn
    )
        internal
        view
        returns (
            uint256 result,
            bool needSync
        )
    {
        uint256 reserveIn = fromToken.universalBalanceOf(address(exchange));
        uint256 reserveOut = destToken.universalBalanceOf(address(exchange));
        (uint112 reserve0, uint112 reserve1, ) = exchange.getReserves();
        if (fromToken > destToken) {
            (reserve0, reserve1) = (reserve1, reserve0);
        }
        needSync = (reserveIn < reserve0 || reserveOut < reserve1);
        result = IDemaxPlatform(burgerPlatform).getAmountOut(amountIn, reserve0, reserve1);
    }

    function pairFor(
        address factory,
        address tokenA,
        address tokenB
    ) public view returns (address) {
        return address(IUniswapV2Factory(factory).getPair(tokenA, tokenB));
    }

    // fetches and sorts the reserves for a pair
    function getReserves(
        address factory,
        address tokenA,
        address tokenB
    ) public view returns (uint256 reserveA, uint256 reserveB) {
        if (tokenA == tokenB) return (reserveA, reserveB);
        (address token0, ) = sortTokens(tokenA, tokenB);
        address pair = pairFor(factory, tokenA, tokenB);
        if (pair != address(0)) {
            (uint256 reserve0, uint256 reserve1, ) = IUniswapV2Exchange(pair).getReserves();
            (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
        }
    }
}
