// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;

import "./IERC20.sol";

interface IBurgerDexManager {
    function dexLength() external view returns (uint);
    function dexs(uint _pid) external view returns (address protocol, address dex, uint256 flag, string memory name);
}