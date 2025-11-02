const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

async function main() {
  // Compile the contract first using solc
  const contractPath = path.join(__dirname, "../contracts/MockX402Adapter.sol");
  console.log("📝 Compiling contract...");
  
  try {
    // Use solc to compile
    const solcOutput = execSync(
      `solc --optimize --combined-json abi,bin ${contractPath}`,
      { encoding: "utf-8" }
    );
    
    const compiled = JSON.parse(solcOutput);
    const contractKey = Object.keys(compiled.contracts).find(k => k.includes("MockX402Adapter"));
    
    if (!contractKey) {
      throw new Error("Contract not found in compilation output");
    }
    
    const contract = compiled.contracts[contractKey];
    const abi = JSON.parse(contract.abi);
    const bytecode = "0x" + contract.bin;
    
    console.log("✅ Contract compiled");
    
    // Connect to Anvil
    const provider = new ethers.JsonRpcProvider("http://localhost:8545");
    const signer = new ethers.Wallet(
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      provider
    );
    
    console.log("🚀 Deploying to Anvil...");
    console.log("   Deployer:", signer.address);
    
    // Deploy
    const factory = new ethers.ContractFactory(abi, bytecode, signer);
    const deployed = await factory.deploy();
    await deployed.waitForDeployment();
    
    const address = await deployed.getAddress();
    console.log("✅ MockX402Adapter deployed at:", address);
    
    // Update ABI file
    const abiPath = path.join(__dirname, "../abis/X402Adapter.json");
    fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
    console.log("✅ ABI saved to:", abiPath);
    
    // Update .env.local
    const envPath = path.join(__dirname, "../.env.local");
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
    
    // Remove MOCK_RELAYER line if it exists
    envContent = envContent.split("\n").filter(line => !line.startsWith("MOCK_RELAYER")).join("\n");
    
    // Update or add NEXT_PUBLIC_X402_ADAPTER
    if (envContent.includes("NEXT_PUBLIC_X402_ADAPTER=")) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_X402_ADAPTER=.*/,
        `NEXT_PUBLIC_X402_ADAPTER=${address}`
      );
    } else {
      envContent += `\nNEXT_PUBLIC_X402_ADAPTER=${address}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log("✅ .env.local updated");
    
    console.log("\n════════════════════════════════════════");
    console.log("✅ DEPLOYMENT COMPLETE!");
    console.log("════════════════════════════════════════");
    console.log("Contract Address:", address);
    console.log("\nRestart your Next.js server to use the new contract!");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main().catch(console.error);

