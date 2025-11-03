import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Deploy X402Adapter with delegation support
 */
async function deployX402WithDelegation() {
  const RPC_URL = process.env.RPC_URL || "http://localhost:8545";
  const DEPLOYER_PK = process.env.DEPLOYER_PK || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  
  // Load existing contracts or deploy new ones
  const POLICY_GATE_ADDR = process.env.POLICY_GATE_ADDR || "";
  const RELAYER_ADDR = process.env.RELAYER_ADDR || ethers.ZeroAddress;
  const DELEGATION_ANCHOR_ADDR = process.env.DELEGATION_ANCHOR_ADDR || "";
  const ATTESTOR_ADDR = process.env.ATTESTOR_ADDR || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Demo: deployer address

  console.log("🚀 Deploying X402Adapter with delegation support...");
  console.log("==========================================");
  console.log("RPC URL:", RPC_URL);
  console.log("Delegation Anchor:", DELEGATION_ANCHOR_ADDR || "(will be set to zero address)");
  console.log("Attestor:", ATTESTOR_ADDR);
  console.log("");

  if (!DELEGATION_ANCHOR_ADDR) {
    console.warn("⚠️  DELEGATION_ANCHOR_ADDR not set. Will use zero address (delegation disabled).");
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(DEPLOYER_PK, provider);
    const chainId = (await provider.getNetwork()).chainId;

    console.log(`Deployer address: ${wallet.address}`);
    console.log(`Chain ID: ${chainId}`);

    // Step 1: Deploy or get SimplePolicyGate
    let policyGate: string;
    if (POLICY_GATE_ADDR) {
      console.log(`\n✅ Using existing SimplePolicyGate at ${POLICY_GATE_ADDR}`);
      policyGate = POLICY_GATE_ADDR;
    } else {
      console.log("\n📝 Deploying SimplePolicyGate...");
      const policyArtifactPath = path.join(__dirname, "../out/SimplePolicyGate.sol/SimplePolicyGate.json");
      if (!fs.existsSync(policyArtifactPath)) {
        throw new Error("SimplePolicyGate artifact not found. Please compile first.");
      }
      const policyArtifact = JSON.parse(fs.readFileSync(policyArtifactPath, "utf-8"));
      const policyFactory = new ethers.ContractFactory(policyArtifact.abi, policyArtifact.bytecode.object, wallet);
      const policyContract = await policyFactory.deploy();
      await policyContract.waitForDeployment();
      policyGate = await policyContract.getAddress();
      console.log(`✅ SimplePolicyGate deployed at: ${policyGate}`);
    }

    // Step 2: Deploy X402Adapter with delegation support (no PPOI needed)
    console.log("\n📝 Deploying X402Adapter with delegation support...");
    const adapterArtifactPath = path.join(__dirname, "../out/X402Adapter.sol/X402Adapter.json");
    if (!fs.existsSync(adapterArtifactPath)) {
      throw new Error("X402Adapter artifact not found. Please compile first.");
    }
    
    const adapterArtifact = JSON.parse(fs.readFileSync(adapterArtifactPath, "utf-8"));
    const adapterFactory = new ethers.ContractFactory(
      adapterArtifact.abi,
      adapterArtifact.bytecode.object,
      wallet
    );
    
    const delegationAnchor = DELEGATION_ANCHOR_ADDR || ethers.ZeroAddress;
    const attestor = ATTESTOR_ADDR;
    
    // X402Adapter constructor (no PPOI): (address _policies, address _relayer, address _delegationAnchor, address _attestor)
    const adapterContract = await adapterFactory.deploy(
      policyGate,        // _policies
      RELAYER_ADDR,      // _relayer
      delegationAnchor,  // _delegationAnchor
      attestor           // _attestor
    );
    await adapterContract.waitForDeployment();
    
    const adapterAddress = await adapterContract.getAddress();
    console.log(`✅ X402Adapter deployed at: ${adapterAddress}`);

    // Verify deployment
    const adapterInstance = new ethers.Contract(adapterAddress, adapterArtifact.abi, provider);
    const deployedPolicyGate = await adapterInstance.policies();
    const deployedDelegationAnchor = await adapterInstance.delegationAnchor();
    const deployedAttestor = await adapterInstance.attestor();
    
    console.log("\n📊 Deployment Verification:");
    console.log(`  Policy Gate: ${deployedPolicyGate}`);
    console.log(`  Delegation Anchor: ${deployedDelegationAnchor}`);
    console.log(`  Attestor: ${deployedAttestor}`);

    // Save deployment info
    const deploymentInfo = {
      chainId: Number(chainId),
      deployedAt: new Date().toISOString(),
      deployer: wallet.address,
      contracts: {
        X402Adapter: adapterAddress,
        SimplePolicyGate: policyGate,
        DelegationAnchor: delegationAnchor !== ethers.ZeroAddress ? delegationAnchor : null,
        Relayer: RELAYER_ADDR,
        Attestor: attestor,
      },
    };

    const deploymentPath = path.resolve(__dirname, "../deployments/x402-with-delegation.json");
    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

    console.log("\n✅ Deployment complete!");
    console.log("\n📝 Add to .env.local:");
    console.log(`NEXT_PUBLIC_X402_ADAPTER=${adapterAddress}`);
    if (delegationAnchor !== ethers.ZeroAddress) {
      console.log(`NEXT_PUBLIC_DELEGATION_ANCHOR=${delegationAnchor}`);
    }
    
    return {
      adapterAddress,
      policyGate,
      delegationAnchor,
    };
  } catch (error: any) {
    console.error("❌ Deployment failed:", error.message);
    if (error.message.includes("artifact")) {
      console.error("\n💡 Tip: Run 'forge build' first to compile contracts");
    }
    throw error;
  }
}

// Run deployment
deployX402WithDelegation()
  .then((result) => {
    console.log(`\n🎉 Success! X402Adapter deployed at ${result.adapterAddress}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment error:", error);
    process.exit(1);
  });

