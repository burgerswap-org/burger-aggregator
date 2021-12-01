// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;

import "../interfaces/IERC20.sol";

library Array {
    function first(IERC20[] memory arr) internal pure returns(IERC20) {
        return arr[0];
    }

    function last(IERC20[] memory arr) internal pure returns(IERC20) {
        return arr[arr.length - 1];
    }
}
