// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;

import './modules/Initializable.sol';

contract BurgerConfig is Initializable {
    address public owner;
    address public dev;
    address public admin;
    address public team;

    event OwnerChanged(address indexed _user, address indexed _old, address indexed _new);
    event DevChanged(address indexed _user, address indexed _old, address indexed _new);
    event AdminChanged(address indexed _user, address indexed _old, address indexed _new);
    event TeamChanged(address indexed _user, address indexed _old, address indexed _new);

    function initialize() external initializer {
        owner = msg.sender;
        dev = msg.sender;
        admin = msg.sender;
        team = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, 'BurgerConfig: Only Owner');
        _;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin || msg.sender == owner, "BurgerConfig: FORBIDDEN");
        _;
    }
    
    modifier onlyDev() {
        require(msg.sender == dev || msg.sender == owner, "BurgerConfig: FORBIDDEN");
        _;
    }

    function changeOwner(address _user) external onlyOwner {
        require(owner != _user, 'BurgerConfig: NO CHANGE');
        emit OwnerChanged(msg.sender, owner, _user);
        owner = _user;
    }

    function changeDev(address _user) external onlyDev {
        require(dev != _user, 'BurgerConfig: NO CHANGE');
        emit DevChanged(msg.sender, dev, _user);
        dev = _user;
    }

    function changeAdmin(address _user) external onlyAdmin {
        require(admin != _user, 'BurgerConfig: NO CHANGE');
        emit AdminChanged(msg.sender, admin, _user);
        admin = _user;
    }

    function changeTeam(address _user) external onlyAdmin {
        require(team != _user, 'BurgerConfig: NO CHANGE');
        emit TeamChanged(msg.sender, admin, _user);
        team = _user;
    }
}