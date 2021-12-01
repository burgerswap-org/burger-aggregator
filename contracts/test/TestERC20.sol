// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;

import "../libraries/SafeMath.sol";

contract TestERC20 {
    
    using SafeMath for uint;

    string public name = "TestToken";
    string public symbol = "TTT";
    uint8 public constant decimals = 18;
    uint public totalSupply;
    address public owner;

    mapping(address => uint) public balanceOf;
    mapping(address => mapping(address => uint)) public allowance;

    event Mint(address indexed user, uint amount);
    event Transfer(address indexed from, address indexed to, uint value);
    event Approval(address indexed owner, address indexed spender, uint value);

    modifier onlyOwner() {
        require(msg.sender == owner, 'ERC20Token: CALLER_NOT_OWNER');
        _;
    }
    
    constructor(uint256 amountToMint) public {
        owner = msg.sender;
        _mint(msg.sender, amountToMint);
    }
    
    function _mint(address to, uint value) internal {
        totalSupply = totalSupply.add(value);
        balanceOf[to] = balanceOf[to].add(value);
        emit Transfer(address(0), to, value);
    }


    function _burn(address from, uint value) internal {
        balanceOf[from] = balanceOf[from].sub(value);
        totalSupply = totalSupply.sub(value);
        emit Transfer(from, address(0), value);
    }

    function _transfer(address from, address to, uint value) private {
        require(balanceOf[from] >= value, 'ERC20Token: INSUFFICIENT_BALANCE');
        balanceOf[from] = balanceOf[from].sub(value);
        balanceOf[to] = balanceOf[to].add(value);
        if (to == address(0)) { // burn
            totalSupply = totalSupply.sub(value);
        }
        emit Transfer(from, to, value);
    }

    function approve(address spender, uint value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(address from, address to, uint value) external returns (bool) {
        require(allowance[from][msg.sender] >= value, 'ERC20Token: INSUFFICIENT_ALLOWANCE');
        allowance[from][msg.sender] = allowance[from][msg.sender].sub(value);
        _transfer(from, to, value);
        return true;
    }
    
    function mint(address to, uint value) external onlyOwner returns (bool) {
        _mint(to, value);
        return true;
    }
    
    function burn(address from, uint value) external returns (bool) {
        _burn(from, value);
        return true;
    }
    
}