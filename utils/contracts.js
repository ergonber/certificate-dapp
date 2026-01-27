export const CONTRACT_CONFIG = {
  ADDRESS: "0x520C105f98873A7d622ef620954d2f284222774B", // Actualizar después del deployment
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
