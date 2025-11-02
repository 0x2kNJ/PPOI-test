import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Deploy x402 contracts (X402Adapter, reuse SimplePolicyGate, PPOIVerifier)
 */
async function deployX402() {
  // Load environment
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const DEPLOYER_PK = process.env.DEPLOYER_PK || '';
  const POOL_ADDR = process.env.POOL_ADDR || ethers.ZeroAddress;
  const RELAYER_ADDR = process.env.RELAYER_ADDR || ethers.ZeroAddress;

  if (!DEPLOYER_PK) {
    throw new Error('DEPLOYER_PK not set');
  }

  console.log('🚀 Deploying x402 contracts...');
  console.log(`RPC: ${RPC_URL}`);
  console.log(`Pool: ${POOL_ADDR}`);
  console.log(`Relayer: ${RELAYER_ADDR}`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(DEPLOYER_PK, provider);
  const chainId = (await provider.getNetwork()).chainId;

  console.log(`Chain ID: ${chainId}`);
  console.log(`Deployer: ${wallet.address}`);

  // Step 1: Deploy or get SimplePolicyGate
  let policyGate: string;
  const policyGateAddr = process.env.POLICY_GATE_ADDR;
  if (policyGateAddr) {
    console.log(`Using existing SimplePolicyGate at ${policyGateAddr}`);
    policyGate = policyGateAddr;
  } else {
    console.log('Deploying SimplePolicyGate...');
    const policyGateArtifact = await import('../out/SimplePolicyGate.sol/SimplePolicyGate.json');
    const PolicyGateFactory = new ethers.ContractFactory(
      policyGateArtifact.abi,
      policyGateArtifact.bytecode,
      wallet
    );
    const policyGateContract = await PolicyGateFactory.deploy();
    await policyGateContract.waitForDeployment();
    policyGate = await policyGateContract.getAddress();
    console.log(`✅ SimplePolicyGate deployed at: ${policyGate}`);
  }

  // Step 2: Deploy or get PPOIVerifier
  let ppoiVerifier: string;
  const ppoiAddr = process.env.PPOI_VERIFIER_ADDR;
  if (ppoiAddr) {
    console.log(`Using existing PPOIVerifier at ${ppoiAddr}`);
    ppoiVerifier = ppoiAddr;
  } else {
    console.log('Deploying PPOIVerifier...');
    // For demo, deploy with placeholder values
    const governance = wallet.address;
    const initialVKHash = ethers.id('INITIAL_VK_HASH');
    const initialEpoch = 1;
    const initialRoot = ethers.id('INITIAL_ROOT');

    const ppoiArtifact = await import('../out/PPOIVerifier.sol/PPOIVerifier.json');
    const PPOIFactory = new ethers.ContractFactory(
      ppoiArtifact.abi,
      ppoiArtifact.bytecode,
      wallet
    );
    const ppoiContract = await PPOIFactory.deploy(
      governance,
      initialVKHash,
      initialEpoch,
      initialRoot
    );
    await ppoiContract.waitForDeployment();
    ppoiVerifier = await ppoiContract.getAddress();
    console.log(`✅ PPOIVerifier deployed at: ${ppoiVerifier}`);
  }

  // Step 3: Deploy X402Adapter
  console.log('Deploying X402Adapter...');
  const adapterArtifact = await import('../out/X402Adapter.sol/X402Adapter.json');
  const AdapterFactory = new ethers.ContractFactory(
    adapterArtifact.abi,
    adapterArtifact.bytecode,
    wallet
  );
  const adapter = await AdapterFactory.deploy(
    policyGate,
    ppoiVerifier,
    POOL_ADDR,
    RELAYER_ADDR
  );
  await adapter.waitForDeployment();
  const adapterAddr = await adapter.getAddress();
  console.log(`✅ X402Adapter deployed at: ${adapterAddr}`);

  // Save deployment info
  const deploymentInfo = {
    chainId: Number(chainId),
    deployedAt: new Date().toISOString(),
    deployer: wallet.address,
    contracts: {
      X402Adapter: adapterAddr,
      SimplePolicyGate: policyGate,
      PPOIVerifier: ppoiVerifier,
      Pool: POOL_ADDR,
      Relayer: RELAYER_ADDR,
    },
  };

  const deploymentPath = path.join(__dirname, '../deployments/x402.json');
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log('\n✅ Deployment complete!');
  console.log('\nContract Addresses:');
  console.log(`  X402Adapter: ${adapterAddr}`);
  console.log(`  SimplePolicyGate: ${policyGate}`);
  console.log(`  PPOIVerifier: ${ppoiVerifier}`);
  console.log(`  Pool: ${POOL_ADDR}`);
  console.log(`  Relayer: ${RELAYER_ADDR}`);
  console.log(`\nDeployment info saved to: ${deploymentPath}`);

  return deploymentInfo;
}

// Run deployment
deployX402()
  .then(() => {
    console.log('\n✅ Deployment script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });

