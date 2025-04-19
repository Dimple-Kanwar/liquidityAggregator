import { expect } from "chai";
import hre from "hardhat";
import {mainnets, testnets, decimal} from "../constants.json";
import jobManagerABI from "../ABI/jobManager.json";
import tokenABI from "../ABI/Token.json";
import getterSetterABI from "../ABI/GetterSetterFacet.json";
import {outputs} from "../app/config.json";

interface Output {
  contractAddress: string
  chain: string
  tokenAddress: string
  function: string
}
interface validation {
  validationAddress: string
  validationFunction: string
  initializerFunction: string
  initializerData: string
}

describe("Liquidity Aggregater Testing", function () {
  let owner: { address: any; }, admin: { address: any; }, agent: { address: any; }, userAccount: { address: any; },  rewardsAddress: { address: any; };
  let jobManagerAddress: string;
  let tokenAddress: string;
  let validatorAddress: string;
  let ValidatorContract: any;
  let JobManagerContract: any;
  const apiUrl:string = "https://ljo49t3ibj.execute-api.eu-west-3.amazonaws.com/dev/totalStakedBudsAcrossAllChains";
  const apiHeaders: string = JSON.stringify({});
  const apiMethod: string = "GET";
  const isMainnet: boolean = true;
  
  let tokenContract:any;
  const enclaveImage = {
    PCR0: '0x9f26130732b85af2d7238f745ccccfa8a3a7c89d25152c1810b233e29e2b493313736ff40dd611f6ee83047a8dfa4c3a',
    PCR1: '0xbcdf05fefccaa8e55bf2c8d6dee9e79bbff31e34bf28a99aa19e6b29c37ee80b214a414b7607236edf26fcb78654e63f',
    PCR2: '0xf78f844bb47a9cb98dd351909f03722d1a21994d095125d34b4ba41929a2c43d2b88f7f68a6f6ce8fbb638b5cb682c3b'
  }
  const enclaveImageId = "0x4b2c229e829abeb6d950c0839add9ff6aaaa48e440443526f797a92542dd1dfa";
  const enclavePubKey = '0x1b9af8ad9002203e557eddd429ea3973ddacf340cd8b09dbbf10e47f9148630daaacb5084431cd5ea720561272bd7960bdc05145bd55d2fb170c90ac433c8a40';
  const enclavePrivateKey = '0x72a91d80f0b832fdb9f4160df01588cd7c3e90443f3fa79ab177d656f526a3cf';
  const GetterSetterFacetContractAddress = "0x5FBFCa950dDF477BC100F0270583E3976Ba6F1E5";

  this.beforeAll(async () => {
    [owner, admin, agent, userAccount, rewardsAddress] = await hre.ethers.getSigners();
    console.log({ owner: owner.address, admin: admin.address, agent:agent.address, userAccount: userAccount.address, rewardsAddress: rewardsAddress.address });
   // deploy MockVerifier contract
   let verifierContractFactory = await hre.ethers.getContractFactory('MockAttestationVerifier');
   const verifierContract = await verifierContractFactory.deploy();
   const verifierAddress = await verifierContract.getAddress();
   console.log({ verifierAddress });

   // deploy Token contract
   let tokenContractFactory = await hre.ethers.getContractFactory('Token');
    tokenContract = await tokenContractFactory.deploy();
   tokenAddress = await tokenContract.getAddress();
   console.log({ tokenAddress });

   // deploy JobManager contract
   const JobManagerContractFactory = await hre.ethers.getContractFactory("JobManager");
   JobManagerContract = await JobManagerContractFactory.deploy(tokenAddress, verifierAddress, admin.address, 100000);
   jobManagerAddress = await JobManagerContract.getAddress();
   console.log({ jobManagerAddress });

    const validatorContractFactory = await hre.ethers.getContractFactory("StakeNBakeValidator");
    ValidatorContract = await validatorContractFactory.deploy(GetterSetterFacetContractAddress);
    validatorAddress = await ValidatorContract.getAddress();
    return { JobManagerContract, tokenContract, ValidatorContract}
  });

  it("Whitelist an image", async function () {
    const whitelist_EnclaveImage_Transaction = await JobManagerContract.connect(admin).whitelistEnclaveImage(enclaveImage);
    const receipt = await whitelist_EnclaveImage_Transaction.wait();
    console.log("Image Whitelist Tx Receipt", receipt.hash);
    const listed_enclaveImage = await JobManagerContract.getWhitelistedImage(enclaveImageId);
    console.log({listed_enclaveImage});
    expect(listed_enclaveImage).to.eql([enclaveImage.PCR0, enclaveImage.PCR1,enclaveImage.PCR2]);
  });

  it("Whitelist a key", async function () {
    const whitelist_EnclaveKey_Transaction = await JobManagerContract.connect(admin).whitelistEnclaveKey(`${enclavePubKey}`, enclaveImageId);
    const receipt = await whitelist_EnclaveKey_Transaction.wait();
    console.log("Image Key Whitelist Tx Receipt", receipt?.hash);
  });
  
  it("create a job", async function () {
    const abiCoder = new hre.ethers.AbiCoder();
    // const input = abiCoder.encode(["bytes"], [apiUrl]);
    // console.log({input})
    const input_bytes = "0x1234";
    const paymentPerSecond = "1000";
    const maxBaseFee = "2000";
    const maxPriorityFee = "3000";
    const gasRefundAmount = "400000";
    const amount = "5000";
    
    const tokenApproval_Transaction = await tokenContract.approve(jobManagerAddress,5000000);
    console.log({tokenApproval_Transaction})
    // const input = {
    //   "totalStakedBudsAcrossAllChains": 15309
    // }
    const initFunctionBytes = hre.ethers.toUtf8Bytes("initialize(uint256,uint256,bytes)");
    console.log({initFunctionBytes});
    let initFunction = hre.ethers.keccak256(initFunctionBytes);
    console.log({initFunction});
    const validateFunctionBytes = hre.ethers.toUtf8Bytes("validate(uint256,uint256,bytes)");
    console.log({validateFunctionBytes});
    let validateFunction = hre.ethers.keccak256(validateFunctionBytes);
    console.log({validateFunction});
    initFunction = abiCoder.encode(['bytes4'], [initFunction]);
    console.log({initFunction});
    validateFunction = abiCoder.encode(['bytes4'], [validateFunction]);
    console.log({validateFunction});
    // const initData = {
    //   isMainnet,
    //   inputs: {
    //     apiUrl,
    //     apiHeaders,
    //     apiMethod
    //   },
    //   outputs
    // }
    // const initDataBytes = hre.ethers.keccak256(JSON.stringify(initData));
    // console.log({initDataBytes})
    // const encodedData = abiCoder.encode(["bytes"], [initDataBytes]);
    // console.log({encodedData})
    const job_create_transaction = await JobManagerContract.createJob(
      [
        {
          validationAddress: validatorAddress,
          validationFunction: validateFunction,
          initializerFunction: initFunction, //"0x1d31888f"
          initializerData: [""]
        },
      ],
      "optional enclave_url",
      enclaveImage,
      input_bytes,
      paymentPerSecond,
      maxBaseFee,
      maxPriorityFee,
      gasRefundAmount,
      amount,
      { value: gasRefundAmount },
    );
    console.log({job_create_transaction})
    const receipt = await job_create_transaction.wait();
    console.log("Job Creation Tx Receipt", receipt?.hash);
    const jobId = await JobManagerContract.jobCount();
    console.log({jobId});
    expect(jobId).to.equal(1);
  });


  // it("execute the job", async function () {
  //   const jobId = await JobManagerContract.connect(agent).jobCount();
  //   const data = await pullData(apiUrl);
  //   console.log("data: ", data);
  //   const attestation = await getAttestation(data, jobId);
  //   console.log("attestation: ", attestation);
  //   const job_execution_transaction = await JobManagerContract.connect(agent).executeJob(jobId, data, rewardsAddress.address, attestation);
  //   console.log("job_execution_transaction: ", job_execution_transaction);
  //   // await expect(
  //   //   await nftMarketplace.connect(acc2).resellItem(1, nftAddress, agent, { value: hre.ethers.parseEther("0.02") })
  //   // ).to.be.revertedWith(
  //   //   "Value sent should be more than NFT price to accomodate the resell fee."
  //   // );
  //   const outputs: Output[] = [
  //     {
  //       contractAddress: "0x5FBFCa950dDF477BC100F0270583E3976Ba6F1E5",
  //       chain: "berachain",
  //       tokenAddress: "0x874cD9Add18d8F09cf75a094Adb7Aa6bcF428d8D",
  //       function: "setGlobalLiquidity(uint256)"
  //     },
  //     {
  //       contractAddress: "0x5FBFCa950dDF477BC100F0270583E3976Ba6F1E5",
  //       chain: "core",
  //       tokenAddress: "0x874cD9Add18d8F09cf75a094Adb7Aa6bcF428d8D",
  //       function: "setGlobalLiquidity(uint256)"
  //     },
  //     {
  //       contractAddress: "0x5FBFCa950dDF477BC100F0270583E3976Ba6F1E5",
  //       chain: "polygon amoy",
  //       tokenAddress: "0x874cD9Add18d8F09cf75a094Adb7Aa6bcF428d8D",
  //       function: "setGlobalLiquidity(uint256)"
  //     },
  //     {
  //       contractAddress: "0x5FBFCa950dDF477BC100F0270583E3976Ba6F1E5",
  //       chain: "arb sepolia",
  //       tokenAddress: "0x874cD9Add18d8F09cf75a094Adb7Aa6bcF428d8D",
  //       function: "setGlobalLiquidity(uint256)"
  //     },
  //     {
  //       contractAddress: "0x5FBFCa950dDF477BC100F0270583E3976Ba6F1E5",
  //       chain: "avx fuji",
  //       tokenAddress: "0x874cD9Add18d8F09cf75a094Adb7Aa6bcF428d8D",
  //       function: "setGlobalLiquidity(uint256)"
  //     },
  //     {
  //       contractAddress: "0x5FBFCa950dDF477BC100F0270583E3976Ba6F1E5",
  //       chain: "bsc testnet",
  //       tokenAddress: "0x874cD9Add18d8F09cf75a094Adb7Aa6bcF428d8D",
  //       function: "setGlobalLiquidity(uint256)"
  //     }
  //   ]

  //   for (const output of outputs) {
  //     const found = chains.find(chain => chain.chain == output.chain);
  //     let RPC_URL = found?.rpcUrl;
  //     const input_bytes = abiCoder.encode(["bytes"],[apiUrl]);
  //     const paymentPerSecond = "1000";
  //     const maxBaseFee = "2000";
  //     const maxPriorityFee = "3000";
  //     const gasRefundAmount = "400000";
  //     const amount = "5000";
  //     let validation: validation[];
  //     validation = [{
  //       validationAddress: output.contractAddress,
  //       validationFunction: abiCoder.encode(["bytes4"], [output.function]),
  //       initializerFunction: abiCoder.encode(["uint256", "uint256", "bytes"], ["initialize(uint256,uint256,bytes)"]), // init function needs to be defined in the output contract with following init args jobCount,_index, _validation.initializerData
  //       initializerData: ""
  //     }]

  //     const provider = new ethers.JsonRpcProvider(RPC_URL);
  //     const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider); // maintain single or multiple pk?
  //     const jobManagerAddress: string = found?.jobManagerContractAddress!;
  //     const tokenAddress: string = process.env.TOKEN_ADDRESS!; // do we need buds token address?
    
  //     const tokenApproval_Transaction = await tokenContract.approve(jobManagerAddress,5000000);
  //     console.log({tokenApproval_Transaction})
  
  //     const job_create_transaction = await jobManager.createJob(
  //       validation,
  //       "optional ig",
  //       attestor.Attestor.getPCRsFromAttestation(
  //         attestation.attestation_document,
  //       ),
  //       input_bytes,
  //       paymentPerSecond,
  //       maxBaseFee,
  //       maxPriorityFee,
  //       gasRefundAmount,
  //       amount,
  //       { value: gasRefundAmount },
  //     );
  //     const receipt = await job_create_transaction.wait();
  //     console.log("Job Creation Tx Receipt", receipt?.hash);
  //   }

  // });
});
