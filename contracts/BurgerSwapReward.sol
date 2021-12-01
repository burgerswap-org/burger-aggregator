// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;
pragma experimental ABIEncoderV2;

import './libraries/SafeMath.sol';
import './modules/Initializable.sol';
import './modules/Configable.sol';
import './interfaces/IRewardToken.sol';
import './interfaces/IERC20.sol';

contract BurgerSwapReward is Configable, Initializable {
    using SafeMath for uint256;

    uint256 public baseRate; // denominator is 1e18
    address public rewardToken;
    mapping(address => uint256) public pids; // skip 0
    mapping(address => uint256) public rewards;
    mapping(address => bool) public whiteList;

    struct PoolInfo {
        address token;
        uint256 rate; // denominator is 1e18
    }
    PoolInfo[] public pools;

    modifier onlyWhiteList() {
        require(whiteList[msg.sender], 'only white list');
        _;
    }

    function initialize(address _rewardToken) external initializer {
        owner = msg.sender;
        rewardToken = _rewardToken;
        pools.push(PoolInfo({token: address(0), rate: 0}));
    }

    function poolLength() external view returns (uint256) {
        return pools.length;
    }

    function setWhiteList(address _addr, bool _value) external onlyDev {
        whiteList[_addr] = _value;
    }

    function setBaseRate(uint256 _rate) public onlyManager {
        require(baseRate != _rate, 'invalid params');
        baseRate = _rate;
    }

    function setRate(address _token, uint256 _rate) public onlyManager {
        uint256 pid = pids[_token];
        if (pid == 0) {
            pid = pools.length;
            pids[_token] = pid;
        }
        if (pid == pools.length) {
            pools.push(PoolInfo({token: _token, rate: _rate}));
        } else {
            PoolInfo storage pool = pools[pid];
            pool.token = _token;
            pool.rate = _rate;
        }
    }

    function batchSetRate(address[] calldata _tokens, uint256[] calldata _rates) external onlyManager {
        require(_tokens.length == _rates.length, 'invalid params');
        for (uint256 i; i < _tokens.length; i++) {
            setRate(_tokens[i], _rates[i]);
        }
    }

    function addReward(
        address _user,
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn,
        uint256 _amountOut
    ) external onlyWhiteList returns (uint256) {
        uint256 rewardIn = computeReward(_tokenIn, _amountIn);
        uint256 rewardOut = computeReward(_tokenOut, _amountOut);
        if (rewardIn > rewardOut) {
            rewards[_user] = rewards[_user].add(rewardIn);
            return rewardIn;
        } else {
            rewards[_user] = rewards[_user].add(rewardOut);
            return rewardOut;
        }
    }

    function computeReward(address _token, uint256 _amount) public view returns (uint256) {
        if (pids[_token] == 0) return 0;
        PoolInfo memory pool = pools[pids[_token]];
        uint256 decimals = 18;
        if (_token != address(0)) {
            decimals = uint256(IERC20(_token).decimals());
        }

        if (decimals < 18) {
            _amount = _amount.mul((10**(18 - decimals)));
        } else {
            _amount = _amount.div(10**(decimals - 18));
        }
        uint256 reward = _amount.mul(baseRate).div(1e18).mul(pool.rate).div(1e18);
        if (reward > IRewardToken(rewardToken).take()) {
            reward = 0;
        }
        return reward;
    }

    function queryReward(address _user) public view returns (uint256) {
        uint256 reward = IRewardToken(rewardToken).take();
        if (reward > rewards[_user]) {
            reward = rewards[_user];
        }
        return reward;
    }

    function claimReward() external returns (uint256) {
        uint256 reward = queryReward(msg.sender);
        require(reward > 0, 'zero');
        require(reward <= rewards[msg.sender], 'over');
        rewards[msg.sender] = 0;
        IRewardToken(rewardToken).mint(msg.sender, reward);
        return reward;
    }

    function iteratePoolInfo(uint256 _start, uint256 _end) external view returns (PoolInfo[] memory result) {
        require(_start <= _end && _start >= 0 && _end >= 0, 'invalid params');
        uint256 count = pools.length;
        if (_end > count) _end = count;
        count = _end - _start;
        result = new PoolInfo[](count);
        if (count == 0) return result;
        uint256 index = 0;
        for (uint256 i = _start; i < _end; i++) {
            result[index] = pools[i];
            index++;
        }
        return result;
    }
}
