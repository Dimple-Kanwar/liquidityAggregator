// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./interfaces/IAttestationVerifier.sol";

contract MockAttestationVerifier {
    address public verifierEnclaveKey;

    function setVerifierEnclaveKey(address _verifierEnclaveKey) external {
        verifierEnclaveKey = _verifierEnclaveKey;
    }

    function verifyAttestationSig(
        bytes memory _attestationSig,
        address _enclaveKey,
        bytes32 _imageId
    ) external view returns (address) {
        return verifierEnclaveKey;
    }
}