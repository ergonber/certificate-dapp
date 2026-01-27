const hre = require("hardhat");

async function main() {
  console.log("🚀 Desplegando CertificateRegistry en Sonic Testnet...");
  
  const CertificateRegistry = await hre.ethers.getContractFactory("CertificateRegistry");
  const certificateRegistry = await CertificateRegistry.deploy();
  
  await certificateRegistry.deployed();
  
  console.log("✅ Contrato desplegado exitosamente!");
  console.log("📄 Dirección del contrato:", certificateRegistry.address);
  console.log("👤 Propietario:", await certificateRegistry.owner());
  
  // Esperar confirmaciones
  await certificateRegistry.deployTransaction.wait(3);
  
  console.log("\n🔗 Explorer URL: https://testnet.soniclabs.com/address/" + certificateRegistry.address);
  console.log("🎉 ¡Listo para usar!");
  
  return certificateRegistry.address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
