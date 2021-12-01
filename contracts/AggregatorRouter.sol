// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;
pragma experimental ABIEncoderV2;

import './libraries/SafeMath.sol';
import './libraries/EnumerableSet.sol';
import "./libraries/DisableFlags.sol";
import './modules/Initializable.sol';
import './modules/Configable.sol';
import './interfaces/IBurgerDexManager.sol';
import './interfaces/IBurgerAggregator.sol';
import './interfaces/IDexProtocal.sol';

contract AggregatorRouter is Configable, Initializable {
    using SafeMath for uint256;
    using DisableFlags for uint256;
    using EnumerableSet for EnumerableSet.AddressSet;

    IBurgerDexManager public dexManager;
    EnumerableSet.AddressSet private _connectors;

    function initialize() external initializer {
        owner = msg.sender;
        _connectors.add(address(0));
    }

    function configure(IBurgerDexManager _dexManager) external onlyDev {
        dexManager = _dexManager;
    }

    function connectors() public view returns (IERC20[] memory allConnectors) {
        allConnectors = new IERC20[](_connectors.length());
        for (uint256 i = 0; i < allConnectors.length; i++) {
            allConnectors[i] = IERC20(uint256(_connectors._inner._values[i]));
        }
    }

    function batchAddConnector(IERC20[] calldata connectors) external onlyDev {
        for (uint256 i = 0; i < connectors.length; i++) {
            addConnector(connectors[i]);
        }
    }

    function addConnector(IERC20 connector) public onlyDev {
        require(_connectors.add(address(connector)), 'Connector already added');
    }

    function removeConnector(IERC20 connector) external onlyDev {
        require(_connectors.remove(address(connector)), 'Unknown connector');
    }

    function getRoutesDistribution(
        IERC20 fromToken,
        IERC20 destToken,
        uint256 flags
    ) external view returns (IERC20[][] memory routes, uint256[] memory distribution) {
        require(fromToken != destToken, 'Tokens should not be the same');

        uint256 dexsCount = dexManager.dexLength();
        Dex[] memory reserves = getAllReserves(flags, dexsCount);
        IERC20[] memory allConnectors = connectors();
        uint256[] memory routeLiquidity = new uint256[](_connectors.length());
        uint256 totalLiquidity;

        for (uint256 i = 0; i < allConnectors.length; i++) {
            for (uint256 j = 0; j < dexsCount; j++) {
                if (!reserves[j].skip) {
                    uint256 liquidity = IDexProtocal(reserves[j].protocal).getLiquidity(
                        reserves[j].dex,
                        fromToken,
                        destToken,
                        allConnectors[i]
                    );
                    routeLiquidity[i] = routeLiquidity[i].add(liquidity);
                    totalLiquidity = totalLiquidity.add(liquidity);
                }
            }
        }

        routes = new IERC20[][](_connectors.length());
        distribution = new uint256[](_connectors.length());
        for (uint256 i = 0; i < allConnectors.length; i++) {
            IERC20[] memory tmp = new IERC20[](3);
            tmp[0] = fromToken;
            tmp[1] = allConnectors[i];
            tmp[2] = destToken;
            routes[i] = tmp;
            distribution[i] = totalLiquidity != 0 ? routeLiquidity[i].mul(1e2).div(totalLiquidity) : 0;
        }

        return (routes, distribution);
    }

    function getRate(IERC20 fromToken, IERC20 destToken, uint256 flags) external view returns (uint256 weightedRate) {
        require(fromToken != destToken, 'Tokens should not be the same');
        uint256 totalWeight;
        uint256 dexsCount = dexManager.dexLength();
        Dex[] memory reserves = getAllReserves(flags, dexsCount);
        IERC20[] memory allConnectors = connectors();

        for (uint256 i = 0; i < allConnectors.length; i++) {
            for (uint256 j = 0; j < dexsCount; j++) {
                if (!reserves[j].skip) {
                    try
                        IDexProtocal(reserves[j].protocal).getRate(reserves[j].dex, fromToken, destToken, allConnectors[i])
                    returns (uint256 rate, uint256 weight) {
                        weightedRate = weightedRate.add(rate.mul(weight));
                        totalWeight = totalWeight.add(weight);
                    } catch {} // solhint-disable-line no-empty-blocks
                }
            }
        }
        if (totalWeight > 0) {
            weightedRate = weightedRate.div(totalWeight);
        }
    }

    struct Dex {
        address protocal;
        address dex;
        bool skip;
    }

    function getAllReserves(uint256 flags, uint dexsCount) public view returns (Dex[] memory reserves) {
        reserves = new Dex[](dexsCount);
        for (uint256 i = 0; i < dexsCount; i++) {
            (address protocol, address dex, uint256 disFlag,) = dexManager.dexs(i);
            if (flags.check(disFlag)) {
                reserves[i] = Dex({
                    protocal: address(0),
                    dex: address(0),
                    skip: true
                });
            } else {
               reserves[i] = Dex({
                    protocal: protocol,
                    dex: dex,
                    skip: false
                });
            }
        }
    }
}
