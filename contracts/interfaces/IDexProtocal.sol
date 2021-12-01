// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;

import './IERC20.sol';

interface IDexProtocal {
    function getTokenPrice(
        address dexAddr,
        IERC20 fromToken,
        IERC20 destToken
    ) external view returns (uint256 price);

    function calculateOnDex(
        address dexAddr,
        IERC20 fromToken,
        IERC20 destToken,
        uint256[] calldata amounts
    ) external view returns (uint256[] memory rets, uint256 gas);

    function swapOnDex(
        address dexAddr,
        address fromToken,
        address destToken,
        uint256 amount,
        address to
    ) external payable;

    function getLiquidity(
        address dexAddr,
        IERC20 fromToken,
        IERC20 destToken,
        IERC20 connector
    ) external view returns (uint256 liquidity);

    function getRate(
        address dexAddr,
        IERC20 fromToken,
        IERC20 destToken,
        IERC20 connector
    ) external view returns (uint256 rate, uint256 weight);
}
