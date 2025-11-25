const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying FilmRegistry contract...");

  const FilmRegistry = await hre.ethers.getContractFactory("FilmRegistry");
  const filmRegistry = await FilmRegistry.deploy();

  await filmRegistry.waitForDeployment();

  const address = await filmRegistry.getAddress();
  
  console.log("✅ FilmRegistry deployed to:", address);
  console.log("\n📝 Update the CONTRACT_ADDRESS in App.jsx with this address:");
  console.log(`   const CONTRACT_ADDRESS = "${address}";`);
  console.log("\n🎉 Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
