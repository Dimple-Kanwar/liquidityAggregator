// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../interfaces/IValidator.sol";

interface GetterSetterFacet {
    function setGlobalStakedBuds(uint256 liquidity) external;
}

contract StakeNBakeValidator is IValidator {
    GetterSetterFacet getterSetterFacet;

    constructor(address _getterSetterFacet) {
        getterSetterFacet = GetterSetterFacet(_getterSetterFacet);
    }

    function initialize(uint256 jobId, uint256 index, bytes memory _data) external returns (bool) {
        (string[] memory keys, string[] memory values) = abi.decode(_data, (string[], string[]));
        for(uint256 i = 0; i < keys.length; i++) {
            emit ParamUpdated(jobId, index, keys[i], values[i]);
        }
        return true;
    }

    function validate(uint256 jobId, uint256 index, bytes memory _data) external returns (bool) {
        (uint256 globalLiquidity) = abi.decode(_data, (uint256));
        getterSetterFacet.setGlobalStakedBuds(globalLiquidity);
        emit DataSubmitted(jobId, index, _data);
        return true;
    }
}