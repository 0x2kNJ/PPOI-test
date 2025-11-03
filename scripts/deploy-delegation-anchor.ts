import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Deploy DelegationAnchor contract
 */
async function deployDelegationAnchor() {
  const RPC_URL = process.env.RPC_URL || "http://localhost:8545";
  const DEPLOYER_PK = process.env.DEPLOYER_PK || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  
  // Default initial root (empty tree)
  const INITIAL_ROOT = process.env.INITIAL_ROOT || "0x0000000000000000000000000000000000000000000000000000000000000000";
  // Default poster (deployer for demo - Anvil account #0)
  const POSTER_ADDR = process.env.POSTER_ADDR || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  console.log("🚀 Deploying DelegationAnchor...");
  console.log("==========================================");
  console.log("RPC URL:", RPC_URL);
  console.log("Initial Root:", INITIAL_ROOT);
  console.log("Poster Address:", POSTER_ADDR);
  console.log("");

  try {
    // Load contract bytecode and ABI
    const artifactPath = path.join(__dirname, "../out/DelegationAnchor.sol/DelegationAnchor.json");
    
    if (!fs.existsSync(artifactPath)) {
      console.error("❌ Contract artifact not found. Please compile first:");
      console.error("   forge build contracts/DelegationAnchor.sol --via-ir --optimizer-runs 200");
      process.exit(1);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(DEPLOYER_PK, provider);

    console.log(`Deployer address: ${wallet.address}`);
    
    const chainId = (await provider.getNetwork()).chainId;
    console.log(`Chain ID: ${chainId}`);

    // Deploy contract
    console.log("\n📝 Deploying DelegationAnchor...");
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode.object, wallet);
    const contract = await factory.deploy(POSTER_ADDR, INITIAL_ROOT);
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log(`✅ DelegationAnchor deployed at: ${contractAddress}`);

    // Verify deployment using contract instance with ABI
    const contractInstance = new ethers.Contract(contractAddress, artifact.abi, provider);
    const deployedRoot = await contractInstance.latestRoot();
    const deployedPoster = await contractInstance.poolOrPoster();
    
    console.log("\n📊 Deployment Verification:");
    console.log(`  Root: ${deployedRoot}`);
    console.log(`  Poster: ${deployedPoster}`);
    
    if (deployedRoot.toLowerCase() !== INITIAL_ROOT.toLowerCase()) {
      console.warn("⚠️  Root mismatch!");
    }
    if (deployedPoster.toLowerCase() !== POSTER_ADDR.toLowerCase()) {
      console.warn("⚠️  Poster mismatch!");
    }

    // Save deployment info
    const deploymentInfo = {
      chainId: Number(chainId),
      deployedAt: new Date().toISOString(),
      deployer: wallet.address,
      contracts: {
        DelegationAnchor: contractAddress,
      },
      deployment: {
        poster: POSTER_ADDR,
        initialRoot: INITIAL_ROOT,
      },
    };

    const deploymentPath = path.resolve(__dirname, "../deployments/delegation-anchor.json");
    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

    console.log("\n✅ Deployment complete!");
    console.log("\n📝 Add to .env.local:");
    console.log(`NEXT_PUBLIC_DELEGATION_ANCHOR=${contractAddress}`);
    
    // Also save to .env.example
    console.log("\n📝 For attestor (demo key):");
    const attestorAddr = ethers.computeAddress(DEPLOYER_PK); // Same key for demo
    console.log(`NILLION_DEMO_ATTESTOR_PK=${DEPLOYER_PK}`);
    console.log(`# Attestor address: ${attestorAddr}`);
    
    return contractAddress;
  } catch (error: any) {
    console.error("❌ Deployment failed:", error.message);
    if (error.message.includes("artifact")) {
      console.error("\n💡 Tip: Run 'forge build contracts/DelegationAnchor.sol --via-ir --optimizer-runs 200' first");
    }
    throw error;
  }
}

// Run deployment
deployDelegationAnchor()
  .then((address) => {
    console.log(`\n🎉 Success! DelegationAnchor deployed at ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment error:", error);
    process.exit(1);
  });

