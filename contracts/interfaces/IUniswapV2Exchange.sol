// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;

import "../libraries/Math.sol";
import "../libraries/SafeMath.sol";
import "../libraries/UniversalERC20.sol";

interface IUniswapV2Exchange {
    function getReserves() external view returns(uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast);
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
    function skim(address to) external;
    function sync() external;
    function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external;
    function mint(address to) external returns (uint liquidity);
    function burn(address to) external returns (uint amount0, uint amount1);
    function transferFrom(address from, address to, uint value) external returns (bool);
}