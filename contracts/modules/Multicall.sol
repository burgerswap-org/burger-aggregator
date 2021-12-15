// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0;
pragma experimental ABIEncoderV2;

contract Multicall {
    function _siglecall( address target, bytes memory data) internal returns (bytes memory) {
        (bool success, bytes memory result) = target.delegatecall(data);
        if (!success) {
            // Next 5 lines from https://ethereum.stackexchange.com/a/83577
            if (result.length < 68) revert();
            assembly {
                result := add(result, 0x04)
            }
            revert(abi.decode(result, (string)));
        }
        return result;
    }

    function _multicall( address[] calldata targets, bytes[] calldata datas) internal returns (bytes[] memory results) {
        uint256 len = targets.length;
        results = new bytes[](len);
        require(datas.length == len, "Error: Array lengths do not match.");
        for (uint256 i = 0; i < len; i++) {
            results[i] = _siglecall(targets[i], datas[i]);
        }
    }

    function siglecall(bytes memory data) public payable returns (bytes memory) {
        return _siglecall(address(this), data);
    }

    function multicall(bytes[] calldata datas) external payable returns (bytes[] memory results) {
        uint256 len = datas.length;
        results = new bytes[](len);
        for (uint256 i = 0; i < len; i++) {
            results[i] = siglecall(datas[i]);
        }
    }
}