// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0;
import '../interfaces/IERC20.sol';
import "../interfaces/IWETH.sol";

contract TestTokenFeature {
    address public weth;
    uint public ethValue;

    constructor(address _weth) public {
        weth = _weth;
    }

    receive() external payable {
    }

    function transferFrom(address token, address to,  uint amount) external {
        IERC20(token).transferFrom(msg.sender, to, amount);
    }

    function transferFromAndETH(address token, address to,  uint amount) external payable {
        IERC20(token).transferFrom(msg.sender, to, amount);
        ethValue += msg.value;
    }

    function saveToWeth(uint amount) external payable {
        require(amount == msg.value, 'invalid');
        ethValue += msg.value;
        IWETH(weth).deposit{value: msg.value}();
    }
}