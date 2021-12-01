// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;

import '../interfaces/IWooRouter.sol';
import '../interfaces/IDexProtocal.sol';
import '../interfaces/IWETH.sol';
import '../libraries/TransferHelper.sol';
import '../libraries/UniversalERC20.sol';
import '../libraries/Sqrt.sol';
import '../modules/Configable.sol';
import '../modules/Common.sol';

contract DexWooFiswap is Common, Configable, IDexProtocal {
    using UniversalERC20 for IERC20;
    using SafeMath for uint256;
    using Sqrt for uint256;    

    receive() external payable {}

    constructor(address _weth) public {
        owner = msg.sender;
        weth = _weth;
    }

    function getTokenPrice(
        address dexAddr,
        IERC20 fromToken,
        IERC20 destToken
    ) external view override returns (uint256 price) {
        // no implement
        return price;
    }

    function getLiquidity(
        address dexAddr,
        IERC20 fromToken,
        IERC20 destToken,
        IERC20 connector
    ) external view override returns (uint256 liquidity) {
        // no implement
        return liquidity;
    }

    function getRate(
        address dexAddr,
        IERC20 fromToken,
        IERC20 destToken,
        IERC20 connector
    ) public view override returns (uint256 rate, uint256 weight) {
        // no implement
        return (rate, weight);
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
        IERC20 fromTokenReal = fromToken.isETH() ? IERC20(weth) : fromToken;
        IERC20 destTokenReal = destToken.isETH() ? IERC20(weth) : destToken;
        rets = new uint256[](amounts.length);
        for (uint256 i = 0; i < amounts.length; i++) {
            try IWooRouter(dexAddr).querySwap(address(fromTokenReal), address(destTokenReal), amounts[i]) returns (uint256 toAmount) {
                rets[i] = toAmount;
            } catch {
                return (rets, gas);
            }
        }
        return (rets, 28_0000);
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
        fromTokenReal.universalApprove(dexAddr, amount);
        IWooRouter(dexAddr).swap(address(fromTokenReal), address(destTokenReal), amount, 0, address(this), address(this));
        if (destToken.isETH()) {
            IWETH(weth).withdraw(IWETH(weth).balanceOf(address(this)));
        }
    }
}
 