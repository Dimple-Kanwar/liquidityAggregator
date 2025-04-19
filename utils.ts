import { ethers } from 'ethers';


// Get provider details
export const getProviderDetails = async (rpcUrl: string, gasKey: string) => {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(gasKey, provider);
    // Return signer and provider
    return { signer, provider };
};