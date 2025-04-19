// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IJobManager {
    struct ValidationSetup {
        address validationAddress;
        bytes4 validationFunction;
        bytes4 initializerFunction;
        bytes initializerData;
    }

    struct Image {
        bytes PCR0;
        bytes PCR1;
        bytes PCR2;
    }
}