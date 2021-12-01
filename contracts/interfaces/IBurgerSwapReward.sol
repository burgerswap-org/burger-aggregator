// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12;

interface IBurgerSwapReward {
    function addReward(address _user, address _tokenIn, address _tokenOut, uint _amountIn, uint _amountOut) external returns (uint);
}