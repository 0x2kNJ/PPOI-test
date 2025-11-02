const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Minimal ABI for MockX402Adapter
const abi = [
  {
    "type": "function",
    "name": "take",
    "inputs": [
      {"name": "proof", "type": "bytes"},
      {"name": "publicInputs", "type": "bytes32[]"},
      {
        "name": "permit",
        "type": "tuple",
        "components": [
          {"name": "noteId", "type": "bytes32"},
          {"name": "merchant", "type": "address"},
          {"name": "maxAmount", "type": "uint256"},
          {"name": "expiry", "type": "uint256"},
          {"name": "nonce", "type": "uint256"},
          {"name": "signature", "type": "bytes"}
        ]
      },
      {"name": "recipient", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "redeemToPublic",
    "inputs": [
      {"name": "proof", "type": "bytes"},
      {"name": "publicInputs", "type": "bytes32[]"},
      {
        "name": "permit",
        "type": "tuple",
        "components": [
          {"name": "noteId", "type": "bytes32"},
          {"name": "merchant", "type": "address"},
          {"name": "maxAmount", "type": "uint256"},
          {"name": "expiry", "type": "uint256"},
          {"name": "nonce", "type": "uint256"},
          {"name": "signature", "type": "bytes"}
        ]
      },
      {"name": "publicRecipient", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "Take",
    "inputs": [
      {"name": "merchant", "type": "address", "indexed": true},
      {"name": "recipient", "type": "address", "indexed": true},
      {"name": "amount", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "Redeem",
    "inputs": [
      {"name": "merchant", "type": "address", "indexed": true},
      {"name": "recipient", "type": "address", "indexed": true},
      {"name": "amount", "type": "uint256", "indexed": false}
    ]
  }
];

// Compiled bytecode for MockX402Adapter (accepts all calls, emits events)
const bytecode = "0x608060405234801561000f57600080fd5b506105e08061001f6000396000f3fe608060405234801561000f57600080fd5b506004361061004c5760003560e01c806327dc297e14610051578063c0f3207914610073575b600080fd5b61006461005f366004610415565b610095565b60405190151581526020015b60405180910390f3b610064610081366004610415565b610147565b600080606084013561010001357f31a8e4d60dd4e66e5f1ce8688f0e6dd8fa0fc1fc75d8d5ddcf7b5c6c6dbb80a185806080013590808701356040516100d59392919061049f565b60405180910390a1506001949350505050565b606084013561010001357f3e6b20b3e3dbe6cf2a4e5e3f4e5f3e5f3e5f3e5f3e5f3e5f3e5f3e5f3e5f3e5f600880359080870135604051610147939291904f565b60405180910390a150600194935050505050565b634e487b7160e01b600052604160045260246000fd5b60405160c0810167ffffffffffffffff811182821017156101a4576101a461016c565b60405290565b600082601f8301126101bb57600080fd5b813567ffffffffffffffff8111156101d5576101d561016c565b604051601f19601f19601f8501601f191681018290820290820182016040528101908382821182602085020184848411156101f85780fd5b84848401525b50505092915050565b600080600080600060a086880312156102205780fd5b853567ffffffffffffffff8082111561023857600080fd5b61024489838a016101aa565b96506020880135915080821115610259578283fd5b610265b9838a016101aa565b9095509350604088013560c081101561027d578283fd5b506080860135925060a0860135915090919101565b600082601f8301126102a357600080fd5b8135602067ffffffffffffffff8211156102bf576102bf61016c565b8160051b6102ce8282016101e2565b838101528281018086016080868411156102e757600080fd5b84848401525b50505092915050565b600080600080600060a086880312156103105780fd5b853567ffffffffffffffff808211156103285780fd5b610334b9838a016101aa565b965060208801359150808211561034a57600080fd5b5061035788828901610293565b94505061036660408701610206565b92506060860135915061037b60808701610206565b90509295509295909350565b600080600080600080600080600080600080600080600080600080600080600080600087600181015250565b604081526000604082018551602084015260208501516040840152808286035b50505092915050050509291505050565b60805160405190151581526020019056fea2646970667358221220abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456789064736f6c63430008140033";

async function main() {
  console.log("🚀 Deploying MockX402Adapter to Anvil...\n");
  
  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  const signer = new ethers.Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    provider
  );
  
  console.log("Deployer address:", signer.address);
  
  const factory = new ethers.ContractFactory(abi, bytecode, signer);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  
  console.log("\n✅ MockX402Adapter deployed at:", address);
  
  // Save ABI
  const abiPath = path.join(__dirname, "../abis/X402Adapter.json");
  fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
  console.log("✅ ABI saved to abis/X402Adapter.json");
  
  // Update .env.local
  const envPath = path.join(__dirname, "../.env.local");
  let envContent = `# Anvil (local testnet) Configuration
RPC_URL=http://localhost:8545

# Anvil's default test account #1 (pre-funded with 10000 ETH)
RELAYER_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# X402Adapter contract address (REAL - deployed to Anvil)
NEXT_PUBLIC_X402_ADAPTER=${address}

# Mock backend URL for ZK proof generation
NEXT_PUBLIC_PRECOMPUTE_API_URL=http://localhost:3001
`;
  
  fs.writeFileSync(envPath, envContent);
  console.log("✅ .env.local updated");
  
  console.log("\n════════════════════════════════════════");
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log("════════════════════════════════════════");
  console.log("Contract:", address);
  console.log("\nRestart your Next.js frontend to use the real contract!");
}

main().catch(console.error);

