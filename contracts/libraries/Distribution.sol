// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;

import "./UniversalERC20.sol";

library Distribution {
    using SafeMath for uint256;
    using UniversalERC20 for IERC20;

    int256 internal constant VERY_NEGATIVE_VALUE = -1e72;

    function _findBestDistribution(
        uint256 s,                // parts
        int256[][] memory amounts // exchangesReturns
    ) internal pure returns(int256 returnAmount, uint256[] memory distribution) {
        uint256 n = amounts.length;

        int256[][] memory answer = new int256[][](n); // int[n][s+1]
        uint256[][] memory parent = new uint256[][](n); // int[n][s+1]

        for (uint i = 0; i < n; i++) {
            answer[i] = new int256[](s + 1);
            parent[i] = new uint256[](s + 1);
        }

        for (uint j = 0; j <= s; j++) {
            answer[0][j] = amounts[0][j];
            for (uint i = 1; i < n; i++) {
                answer[i][j] = -1e72;
            }
            parent[0][j] = 0;
        }

        for (uint i = 1; i < n; i++) {
            for (uint j = 0; j <= s; j++) {
                answer[i][j] = answer[i - 1][j];
                parent[i][j] = j;

                for (uint k = 1; k <= j; k++) {
                    if (answer[i - 1][j - k] + amounts[i][k] > answer[i][j]) {
                        answer[i][j] = answer[i - 1][j - k] + amounts[i][k];
                        parent[i][j] = j - k;
                    }
                }
            }
        }

        distribution = new uint256[](n);

        uint256 partsLeft = s;
        for (uint curExchange = n - 1; partsLeft > 0; curExchange--) {
            distribution[curExchange] = partsLeft - parent[curExchange][partsLeft];
            partsLeft = parent[curExchange][partsLeft];
        }

        returnAmount = (answer[n - 1][s] == VERY_NEGATIVE_VALUE) ? 0 : answer[n - 1][s];
    }

    function _linearInterpolation(
        uint256 value,
        uint256 parts
    ) internal pure returns(uint256[] memory rets) {
        rets = new uint256[](parts);
        for (uint i = 0; i < parts; i++) {
            rets[i] = value.mul(i + 1).div(parts);
        }
    }

    function _tokensEqual(IERC20 tokenA, IERC20 tokenB) internal pure returns(bool) {
        return ((tokenA.isETH() && tokenB.isETH()) || tokenA == tokenB);
    }
}
