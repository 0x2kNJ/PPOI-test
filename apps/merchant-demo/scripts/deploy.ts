import { ethers } from "ethers";

const MOCK_CONTRACT_BYTECODE =
  "0x608060405234801561001057600080fd5b506103e8806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c806394bf804d1461003b578063c0f320791461005b575b600080fd5b61004e6100493660046102c6565b61006e565b60405161005291906103" +
  "7a565b60405180910390f35b61004e6100693660046102c6565b610096565b6001600160a01b038116600090815260208190526040902060010154600160a01b90046001146100a15760405162461bcd60e51b8152600401610098906103a0565b6040518091" +
  "0390fd5b6001905092915050565b6001600160a01b038116600090815260208190526040902060010154600160a01b90046001146100e75760405162461bcd60e51b81526004016100de906103a0565b60405180910390fd5b600190509291505056";

async function main() {
  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  const signer = new ethers.Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    provider
  );

  console.log("Deploying MockX402Adapter...");
  console.log("Deployer address:", signer.address);

  // Simplified: just deploy a contract that always succeeds
  const abi = [
    "function take(bytes proof, bytes32[] publicInputs, tuple(bytes32 noteId, address merchant, uint256 maxAmount, uint256 expiry, uint256 nonce, bytes signature) permit, address recipient, uint256 amount) returns (bool)",
    "function redeemToPublic(bytes proof, bytes32[] publicInputs, tuple(bytes32 noteId, address merchant, uint256 maxAmount, uint256 expiry, uint256 nonce, bytes signature) permit, address publicRecipient, uint256 amount) returns (bool)",
  ];

  const bytecode =
    "0x6080604052348015600f57600080fd5b506101a88061001f6000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c806327dc297e1461003b578063c0f320791461005d575b600080fd5b61004e6100493660046100ef565b61006d565b60405190151581526020015b60405180910390f35b61004e61006b3660046100ef565b005b600192915050565b60008060408385031215610  08857600080fd5b50919050565bfea2646970667358221220d8e9e8c1c6c8d3d0b5e3f1e9d5d8e0c1d0c9c0b0a0d0c0d0e0c0d0c064736f6c634300080b0033";

  const factory = new ethers.ContractFactory(abi, bytecode, signer);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✅ MockX402Adapter deployed at:", address);
  console.log("\nUpdate your .env.local with:");
  console.log(`NEXT_PUBLIC_X402_ADAPTER=${address}`);

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

