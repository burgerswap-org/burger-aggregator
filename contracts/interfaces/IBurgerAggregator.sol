// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;
pragma experimental ABIEncoderV2;

import './IBurgerDexManager.sol';

interface IBurgerAggregator {
    struct Dex {
        address protocal;
        address dex;
        bool skip;
    }

    struct Args {
        IERC20 fromToken;
        IERC20 destToken;
        uint256 amount;
        uint256 parts;
        uint256 flags;
        uint256 destTokenEthPriceTimesGasPrice;
        uint256[] distribution;
        int256[][] matrix;
        uint256[] gases;
        uint256 dexsCount;
        Dex[] reserves;
    }

    struct GetReturnMutilState {
        IERC20[]  tokens;
        uint256 amount;
        uint256[]  parts;
        uint256[]  flags;
        uint256[]  destTokenEthPriceTimesGasPrices;
        uint256[]  dist;
    }

    struct SwapState {
        Dex[] reserves;
        uint256 parts;
        uint256 lastNonZeroIndex;
        uint256 remainingAmount;
    }

    function getAllReserves(uint256 flags, uint dexsCount) external view returns (Dex[] memory reserves);

    function getExpectedReturn(
        IERC20 fromToken,
        IERC20 destToken,
        uint256 amount,
        uint256 parts,
        uint256 flags
    ) external view returns (uint256 returnAmount, uint256[] memory distribution);

    function getExpectedReturnWithGas(
        IERC20 fromToken,
        IERC20 destToken,
        uint256 amount,
        uint256 parts,
        uint256 flags,
        uint256 destTokenEthPriceTimesGasPrice
    )
        external
        view
        returns (
            uint256 returnAmount,
            uint256 feeAmount,
            uint256 estimateGasAmount,
            uint256[] memory distribution
        );

    function getExpectedReturnWithGasMulti(
        IERC20[] calldata tokens,
        uint256 amount,
        uint256[] calldata parts,
        uint256[] calldata flags,
        uint256[] calldata destTokenEthPriceTimesGasPrices
    )
        external
        view
        returns (
            uint256[] memory returnAmounts,
            uint256 feeAmount,
            uint256 estimateGasAmount,
            uint256[] memory distribution
        );

    function swap(
        IERC20 fromToken,
        IERC20 destToken,
        uint256 amount,
        uint256 minReturn,
        uint256[] calldata distribution,
        uint256 flags
    ) external payable returns (uint256 returnAmount);

    function swapMulti(
        IERC20[] calldata tokens,
        uint256 amount,
        uint256 minReturn,
        uint256[] calldata distribution,
        uint256[] calldata flags
    ) external payable returns (uint256 returnAmount);
}
