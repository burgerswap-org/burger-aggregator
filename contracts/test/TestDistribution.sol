// SPDX-License-Identifier: MIT

pragma solidity >=0.6.6;
pragma experimental ABIEncoderV2;

import "../libraries/Distribution.sol";

contract TestDistribution {
    
    function findBestDistribution(
        uint256 parts,
        int256[][] memory amounts
    ) public pure returns(uint256[] memory distribution) {
        (, distribution) = Distribution._findBestDistribution(parts, amounts);
        return distribution;
    }
    
    function getAmountsLength(int256[][] memory amounts) public pure returns(uint256) {
        return amounts.length;
    }
}