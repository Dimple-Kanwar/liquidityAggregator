// SPDX-License-Identifier: MIT

pragma solidity 0.8.24;

interface IAttestationVerifier {
    function verify(
        bytes memory attestation,
        bytes memory enclaveKey,
        bytes memory PCR0,
        bytes memory PCR1,
        bytes memory PCR2,
        uint256 enclaveCPUs,
        uint256 enclaveMemory,
        uint256 timestamp
    ) external view;
    function verify(bytes memory data) external view;
}