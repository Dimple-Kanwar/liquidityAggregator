// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

import "./AttestationAuther.sol";
import "hardhat/console.sol";
import "./interfaces/IAttestationVerifier.sol";
import "./interfaces/IValidator.sol";
import "./interfaces/IJobManager.sol";

contract JobManager is IJobManager, AttestationAuther, AccessControlEnumerable {
    struct Validation {
        address validationAddress;
        bytes4 validationFunction;
    }

    struct Job {
        address creator;
        Validation[] validations;
        Image image;
        string enclave_url;
        bytes input;
        uint256 paymentPerSecond;
        uint256 lastExecutionTime;
        uint256 maxBaseFee;
        uint256 maxPriorityFee;
        uint256 gasRefundAmount;
        uint256 amount;
    }

    uint256 public jobCount;
    mapping(uint256 => Job) public jobs;

    IERC20 public token;

    event JobCreated(
        uint256 indexed jobId,
        string enclaveUrl,
        bytes input,
        address indexed creator,
        Validation[] validations,
        uint256 paymentPerSecond,
        uint256 maxBaseFee,
        uint256 maxPriorityFee,
        uint256 gasRefundAmount,
        uint256 amount
    );
    event JobExecuted(
        uint256 indexed jobId,
        address indexed executor,
        address indexed rewardAddress,
        uint256 payment,
        bytes data
    );
    event TokenUpdated(
        address indexed token
    );
    event VerifierUpdated(
        address indexed verifier
    );

    modifier onlyAdmin() {
        _checkRole(DEFAULT_ADMIN_ROLE);
        _;
    }

    constructor(address _token, address _verifier, address _admin, uint256 _maxAge) AttestationAuther(
        IAttestationVerifier(_verifier), 
        _maxAge, 
        new EnclaveImage[](0)
    ) {
        _updateToken(_token);

        _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    function createJob(
        ValidationSetup[] memory _validations,
        string memory _enclave_url,
        Image memory _pcrs,
        bytes memory _input,
        uint256 _paymentPerSecond,
        uint256 _maxBaseFee,
        uint256 _maxPriorityFee,
        uint256 _gasRefundAmount,
        uint256 _amount
    ) external payable returns(uint256) {
        // sanity check on inputs
        require(_amount != 0, "Invalid token amount");

        // get payment from caller
        token.transferFrom(msg.sender, address(this), _amount);
        // add job to job list
        jobCount++;
        Job storage job = jobs[jobCount];
        job.creator = msg.sender;
        job.image = Image(_pcrs.PCR0, _pcrs.PCR1, _pcrs.PCR2);
        job.enclave_url = _enclave_url;
        job.input = _input;
        job.paymentPerSecond = _paymentPerSecond;
        job.lastExecutionTime = block.timestamp;
        job.maxBaseFee = _maxBaseFee;
        job.maxPriorityFee = _maxPriorityFee;
        require(msg.value >= _gasRefundAmount, "Gas refund amount insufficient");
        job.gasRefundAmount = _gasRefundAmount;
        job.amount = _amount;
        for(uint256 i = 0; i < _validations.length; i++) {
            _initializeValidations(_validations[i], i);
            job.validations.push(Validation({
                validationAddress: _validations[i].validationAddress,
                validationFunction: _validations[i].validationFunction
            }));
        }
        emit JobCreated(jobCount, _enclave_url, _input, msg.sender, job.validations, _paymentPerSecond, _maxBaseFee, _maxPriorityFee, _gasRefundAmount, _amount);
        return jobCount;
    }

    function _initializeValidations(ValidationSetup memory _validation, uint256 _index) internal {
        require(_validation.validationAddress != address(0), "Invalid validation address");
        // TODO: check if validation address is a contract
        // TODO: Allow fallback function to be called
        // TODO: check if validation function exists
        require(_validation.validationFunction != bytes4(0), "Invalid validation function");
        (bool success, ) = _validation.validationAddress.call(abi.encodeWithSelector(
            _validation.initializerFunction,
            jobCount,
            _index,
            _validation.initializerData
        ));
        require(success, "Validation initalization failed");
    }

    function executeJob(
        uint256 jobId, 
        bytes memory data,
        address rewardAddress,
        bytes memory attestation
    ) external {
        // check if job is active
        Job storage job = jobs[jobId];
        // verify enclave signature
        address enclaveKey = _verifyEnclaveSig(
            data,
            job.input,
            jobId,
            rewardAddress,
            attestation
        );
        console.log("executeJob:: enclaveKey: ", enclaveKey);
        isEnclaveKeyValid(enclaveKey);
        
        // check if job validations are met
        for(uint256 i = 0; i < job.validations.length; i++) {
            (bool success, bytes memory result) = job.validations[i].validationAddress.call(abi.encodeWithSelector(
                job.validations[i].validationFunction,
                jobId,
                i,
                data
            ));
            require(success, "Validation call reverted");
            console.log("executeJob:: result: ");
            console.logBytes(result);
            console.log("executeJob:: abi.decode(result, (bool)): ");
            console.logBool(abi.decode(result, (bool)));
            require(abi.decode(result, (bool)), "Validation check failed");
        }
        // execute job
        uint256 _payment = job.paymentPerSecond*(block.timestamp - job.lastExecutionTime);
        console.log("executeJob:: _payment: ", _payment);
        uint256 _balance = token.balanceOf(address(this));
        console.log("executeJob:: _balance: ", _balance);
        console.log("executeJob:: job.amount: ", job.amount);
        if(job.amount > _payment) {
            job.amount -= _payment;
            console.log("executeJob:: if job.amount: ", job.amount);
        } else {
            console.log("executeJob:: job.amount > _payment false");
            delete job.amount;
        }
        job.lastExecutionTime = block.timestamp;
        console.log("executeJob:: job.lastExecutionTime: ", job.lastExecutionTime);
        emit JobExecuted(jobCount, msg.sender, rewardAddress, job.paymentPerSecond, data);
        console.log("executeJob:: JobExecuted emitted!! ");
        console.log("executeJob:: _balance: ", _balance);
        if(_balance == 0) return;
        if(_balance > _payment) {
            console.log("executeJob:: _balance > _payment true: ");
            token.transfer(rewardAddress, _payment);
        } else {
            console.log("executeJob:: _balance > _payment false: ");
            token.transfer(rewardAddress, _balance);
        }
    }

    function _verifyEnclaveSig(
        bytes memory data, 
        bytes memory input, 
        uint256 jobId,
        address rewardAddress,
        bytes memory enclaveSig
    ) internal pure returns (address) {
        console.log("_verifyEnclaveSig:: enclaveSig: ");
        console.logBytes(enclaveSig);
        bytes32 hash = keccak256(abi.encode(
            data,
            input,
            jobId,
            rewardAddress
        ));
        console.log("_verifyEnclaveSig:: hash: ");
        console.logBytes32(hash);
        hash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        console.log("_verifyEnclaveSig:: hash2: ");
        console.logBytes32(hash);
        address enclaveKey = ECDSA.recover(hash, enclaveSig);
        console.log("_verifyEnclaveSig:: enclaveKey: ", enclaveKey);
        require(enclaveKey != address(0), "Invalid enclave signature");
        return enclaveKey;
    }

    function isEnclaveKeyValid(address key) public view {
        _allowOnlyVerified(key);
    }

    function updateToken(address _token) external onlyAdmin {
        _updateToken(_token);
    }

    function whitelistEnclaveImage(EnclaveImage memory image) external onlyAdmin {
        console.log("image: ");
        _whitelistEnclaveImage(image);
    }

    function whitelistEnclaveKey(bytes memory enclavePubKey, bytes32 imageId) external onlyAdmin {
        _whitelistEnclaveKey(enclavePubKey, imageId);
    }

    function _updateToken(address _token) internal {
        require(_token != address(0), "Invalid token");
        token = IERC20(_token);
        emit TokenUpdated(_token);
    }
}