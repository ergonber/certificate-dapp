export const CONTRACT_CONFIG = {
  ADDRESS: "0xAe48Ed8cD53e6e595E857872b1ac338E17F08549", // Actualizar después del deployment
  SONIC_RPC_URL: "https://rpc.testnet.soniclabs.com",
  CHAIN_ID: 14601,
  EXPLORER_URL: "https://testnet.soniclabs.com"
};

export const CONTRACT_ABI = [
  {
    "inputs": [
      {"internalType": "string","name": "_fullName","type": "string"},
      {"internalType": "string","name": "_courseTitle","type": "string"},
      {"internalType": "uint256","name": "_date","type": "uint256"},
      {"internalType": "string","name": "_grade","type": "string"},
      {"internalType": "string","name": "_cid","type": "string"}
    ],
    "name": "createCertificate",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
