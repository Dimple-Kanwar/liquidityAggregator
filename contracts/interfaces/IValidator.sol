// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IValidator {
    // TODO: make key indexed
    event ParamUpdated(uint256 indexed jobId, uint256 indexed validationIndex, string key, string value);
    event DataSubmitted(uint256 indexed jobId, uint256 indexed validationIndex, bytes data);
    function initialize(uint256 jobId, uint256 validationIndex, bytes memory _data) external returns (bool);
    function validate(uint256 jobId, uint256 validationIndex, bytes memory _data) external returns (bool);
}