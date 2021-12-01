// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;
pragma experimental ABIEncoderV2;

import './modules/Initializable.sol';
import './modules/Configable.sol';
import "./interfaces/IDexProtocal.sol";
import "./interfaces/IBurgerDexManager.sol";

contract BurgerDexManager is Configable, Initializable, IBurgerDexManager{
    BurgerDexProtocal[] public override dexs;
    mapping(address => uint) public pids;
    mapping(address => address) public dexMapProtocol;

    struct BurgerDexProtocal {
        address protocol;
        address dex;
        uint256 flag; // 2**n
        string name;
    }

    event SetProtocal(address protocol, address dex, uint flag, string name);

    function initialize() external initializer {
        owner = msg.sender;
    }

    function dexLength() external override view returns (uint) {
        return dexs.length;
    }

    function setProtocol(address _protocol, address _dex, uint256 _flag, string memory _name) public onlyDev {
        require(_protocol != address(0) && _dex != address(0), 'zero address');
        uint pid = dexMapProtocol[_dex]!=address(0)? pids[_dex] : dexs.length;
        BurgerDexProtocal memory dex = BurgerDexProtocal({
            dex: _dex,
            protocol: _protocol,
            flag: _flag,
            name: _name
        });
        if (dexMapProtocol[_dex]!=address(0)) {
            dexs[pid] = dex;
        } else {
            pids[_dex] = dexs.length;
            dexMapProtocol[_dex] = _protocol;
            dexs.push(dex);
        }
        emit SetProtocal(_protocol, _dex, _flag, _name);
    } 

    function batchSetProtocol(
        address[] calldata _protocols,
        address[] calldata _dexs,
        uint256[] calldata _flags,
        string[] calldata _names
    ) external onlyDev {
        require(
            _dexs.length == _protocols.length 
            && _protocols.length == _flags.length 
            && _flags.length == _names.length, 
            'invalid parameters'
        );
        for (uint i = 0; i < _dexs.length; i++) {
            setProtocol(_protocols[i], _dexs[i], _flags[i], _names[i]);
        }
    }
}