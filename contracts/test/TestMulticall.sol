// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0;
pragma experimental ABIEncoderV2;

import '../modules/Multicall.sol';

contract TestMulticall is Multicall {
    address public weth;

    constructor(address _weth) public {
        weth = _weth;
    }

    function testTransferFrom(address target, address token, address to,  uint amount) external {
        // 0x23b872dd transferFrom(address,address,uint256)
        siglecall(abi.encodeWithSelector(0x23b872dd, token, to, amount));
    }

    function testTransferFromList(address[] calldata target, address[] calldata token, address[] calldata to,  uint[] calldata amount) external {
        // 0x23b872dd transferFrom(address,address,uint256)
        for(uint i; i<target.length; i++) {
            siglecall(abi.encodeWithSelector(0x23b872dd, token[i], to[i], amount[i]));
        }
    }
}