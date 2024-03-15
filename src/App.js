'use client';

import React from 'react';
import { PrimeSdk } from '@etherspot/prime-sdk';
import { ethers, BigNumber} from 'ethers'
import './App.css';


const App = () => {

  
  const [etherspotWalletAddress, setEtherspotWalletAddress] = React.useState('0x0000000000000000000000000000000000000000');
  const [eoaWalletAddress, setEoaWalletAddress] = React.useState('0x0000000000000000000000000000000000000000');
  const [eoaPrivateKey, setEoaPrivateKey] = React.useState('');

  const generateRandomEOA = async () => {
    // Create random EOA wallet
    const randomWallet = ethers.Wallet.createRandom();
    setEoaWalletAddress(randomWallet.address);
    setEoaPrivateKey(randomWallet.privateKey);
}

  const generateEtherspotWallet = async () => {
    // Initialise Etherspot SDK
    const primeSdk = new PrimeSdk({ privateKey: eoaPrivateKey}, { chainId: 84532, projectKey: '' })
    const address = await primeSdk.getCounterFactualAddress();
    setEtherspotWalletAddress(address);
    console.log('\x1b[33m%s\x1b[0m', `EtherspotWallet address: ${address}`);
  }

  const mintNFT = async () => {
  
    const primeSdk = new PrimeSdk({ privateKey: eoaPrivateKey}, { chainId: 84532, projectKey: '' })

    // Whitelist address
    const address = [await primeSdk.getCounterFactualAddress()];
    const api_key = "arka_public_key";
    const chainId = 84532;
    const returnedValue = await fetch("https://arka.etherspot.io/whitelist", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ params: [address, chainId, api_key] }),
    })
      .then((res) => {
        return res.json();
      })
      .catch((err) => {
        console.log(err);
      });

    console.log("Whitelist response: ", returnedValue);

    // clear the transaction batch
    await primeSdk.clearUserOpsFromBatch();

    // get contract interface
    const erc721Interface = new ethers.utils.Interface([
      "function mint(address _targetAddress)",
    ]);

    const erc721Data = erc721Interface.encodeFunctionData("mint", [etherspotWalletAddress]);
    await primeSdk.addUserOpsToBatch({
      to: "0x7010F7Ac55A64Ca6b48CDC7C680b1fb588dF439f",
      data: erc721Data,
    });

    // estimate
    const estimation = await primeSdk.estimate({
      paymasterDetails: {
        url: `https://arka.etherspot.io?apiKey=arka_public_key&chainId=84532`,
        context: { mode: "sponsor" },
      },
    });

    console.log("estimation: ",estimation);

    // sign the UserOp and send to the bundler
    const uoHash = await primeSdk.send(estimation);
    console.log(`UserOpHash: ${uoHash}`);

    // get transaction hash...
    console.log("Waiting for transaction...");
    let userOpsReceipt = null;
    const timeout = Date.now() + 60000; // 1 minute timeout
    while (userOpsReceipt == null && Date.now() < timeout) {
      userOpsReceipt = await primeSdk.getUserOpReceipt(uoHash);
    }
    console.log("\x1b[33m%s\x1b[0m", `Transaction Receipt: `, userOpsReceipt);

    console.log("txn hash: ",userOpsReceipt.receipt.transactionHash)
  };

  return (
    <div className="App-header">

      <h1  className="App-title">Getting started with Etherspot Prime</h1>

      <p> To initialise the SDK, it requires a Key Based Wallet(KBW) to be passed in.</p>

      <button className="App-button" onClick={() => generateRandomEOA()}>
            First click here to generate a random KBW. 
      </button>
      <a target="_blank" href={"https://sepolia.basescan.org/address/" + eoaWalletAddress}>
        KBW Address: {eoaWalletAddress}
      </a>

      <p>
        Now we can intialise the SDK with this address as the owner, and create an Etherspot smart contract wallet.
      </p>

      <button onClick={() => generateEtherspotWallet()}>
            Generate Etherspot Smart Contract Wallet
      </button>
      <a target="_blank" href={"https://sepolia.basescan.org/address/" + etherspotWalletAddress}>
    
        Etherspot Smart Account Address: {etherspotWalletAddress}
      </a>

      <p>
           
        <a target="_blank" href="https://etherspot.fyi/prime-sdk/intro">
        Now you have a wallet created on Base Sepolia you can explore what else we can do with the Prime SDK.</a>
      </p>

      <button onClick={() => mintNFT()}>
           Mint NFT to your wallet (gas paid for by Arka Paymaster!)
      </button>
    </div>
  )
}

export default App;
