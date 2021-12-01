// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;

import '../interfaces/IUniswapV2Factory.sol';
import '../interfaces/IUniswapV2Exchange.sol';
import '../interfaces/IDexProtocal.sol';
import '../interfaces/IWETH.sol';
import '../libraries/TransferHelper.sol';
import '../libraries/UniversalERC20.sol';
import '../libraries/Sqrt.sol';
import '../modules/Configable.sol';
import '../modules/Common.sol';

contract DexUniswapV2 is Common, Configable, IDexProtocal {
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
        uint256 dds = fromTokenReal.decimals();
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
        return _calculateUniswapV2(dexAddr, fromToken, destToken, amounts);
    }

    function swapOnDex(
        address dexAddr,
        address fromToken,
        address destToken,
        uint256 amount,
        address to
    ) external payable override {
        _swapOnUniswapV2(dexAddr, IERC20(fromToken), IERC20(destToken), amount);
        if (to != address(this)) {
            IERC20(destToken).universalTransfer(to, IERC20(destToken).universalBalanceOf(address(this)));
        }
    }

    function _calculateUniswapV2(
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
                rets[i] = _calculateUniswapFormula(fromTokenBalance, destTokenBalance, amounts[i]);
            }
            return (rets, 14_1000);
        }
    }

    function _calculateUniswapFormula(
        uint256 fromBalance,
        uint256 toBalance,
        uint256 amount
    ) internal pure returns (uint256) {
        if (amount == 0) {
            return 0;
        }
        return amount.mul(toBalance).mul(997).div(fromBalance.mul(1000).add(amount.mul(997)));
    }

    function _swapOnUniswapV2(
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
        IUniswapV2Exchange exchange = IUniswapV2Exchange(
            pairFor(dexAddr, address(fromTokenReal), address(destTokenReal))
        );
        (uint256 returnAmount, bool needSync, bool needSkim) = _getReturn(dexAddr, exchange, fromTokenReal, destTokenReal, amount);
        if (needSync) {
            exchange.sync();
        } else if (needSkim) {
            exchange.skim(team());
        }

        fromTokenReal.universalTransfer(address(exchange), amount);
        if (uint256(address(fromTokenReal)) < uint256(address(destTokenReal))) {
            exchange.swap(0, returnAmount, address(this), '');
        } else {
            exchange.swap(returnAmount, 0, address(this), '');
        }

        if (destToken.isETH()) {
            IWETH(weth).withdraw(IWETH(weth).balanceOf(address(this)));
        }
    }

    function _getReturn(
        address dexAddr,
        IUniswapV2Exchange exchange,
        IERC20 fromToken,
        IERC20 destToken,
        uint256 amountIn
    )
        internal
        view
        returns (
            uint256 result,
            bool needSync,
            bool needSkim
        )
    {
        uint256 reserveIn = fromToken.universalBalanceOf(address(exchange));
        uint256 reserveOut = destToken.universalBalanceOf(address(exchange));
        (uint256 reserve0, uint256 reserve1) = getReserves(dexAddr, address(fromToken), address(destToken));
        needSync = (reserveIn < reserve0 || reserveOut < reserve1);
        needSkim = !needSync && (reserveIn > reserve0 || reserveOut > reserve1);

        uint256 amountInWithFee = amountIn.mul(997);
        uint256 numerator = amountInWithFee.mul(Math.min(reserveOut, reserve1));
        uint256 denominator = Math.min(reserveIn, reserve0).mul(1000).add(amountInWithFee);
        result = (denominator == 0) ? 0 : numerator.div(denominator);
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
        address pair = pairFor(factory, tokenA, tokenB);
        if (pair != address(0)) {
            (address token0, ) = sortTokens(tokenA, tokenB);
            (uint256 reserve0, uint256 reserve1, ) = IUniswapV2Exchange(pair).getReserves();
            (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
        }
    }
}
 