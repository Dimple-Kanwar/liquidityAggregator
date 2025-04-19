import axios from 'axios';
import { Wallet, ethers, toBeArray, Contract } from 'ethers';
import { abi } from "./ABI/GetterSetterFacet.json";
// import { abi } from "./ABI/jobManager.json";
import "dotenv/config";
import { isMainnet, gasKey, apiDetails, outputs} from "./app/config.json";
import { testnets, mainnets } from "./constants.json";
import { getProviderDetails } from './utils'

export const executeJob = async () => {
    const data = await pullData(apiDetails.url, apiDetails.method, apiDetails.headers, apiDetails.data);
    const globalLiquidity = data.totalStakedBudsAcrossAllChains;
    console.log("executeJob:: globalLiquidity: ",  globalLiquidity);
    if (isMainnet) {
        let num = 0;
        outputs.forEach(async output => {
            num++
            console.log("m counter: ",num)
            const mainnet = mainnets.find((mainnet) => mainnet.chain == output.chain);
            console.log("found mainnet chain: ", mainnet);
            const res =  await updateData(output.contractAddress, Math.round(globalLiquidity), mainnet!.rpcUrl);
            console.log({res});
        });
    } else {
        let num = 0;
        outputs.forEach(async output => {
            num++;
            console.log("t counter: ",num)
            const testnet = testnets.find((testnet) => testnet.chain == output.chain);
            console.log("found testnet: ", testnet);
            const res =  await updateData(output.contractAddress, Math.round(globalLiquidity), testnet!.rpcUrl);
            console.log({res});
        });
    }
}


const updateData = async (contractAddress: string,globalLiquidity: number, rpcUrl: string) => {
    const { signer } = await getProviderDetails(rpcUrl, gasKey);
    const contract  = new ethers.Contract(contractAddress, abi, signer);
    console.log({contract})
    await contract.setGlobalStakedBuds(globalLiquidity);
}

const pullData = async (apiUrl:string, method: string, headers: any, body: any): Promise<any> => {
    const response = await axios({url: apiUrl, method, headers, data: body});
    console.log("pullData:: response.data: ", response.data);
    const data = response.data;
    return data;
}

executeJob();