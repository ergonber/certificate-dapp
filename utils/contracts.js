export const CONTRACT_CONFIG = {
  ADDRESS: "0xAe48Ed8cD53e6e595E857872b1ac338E17F08549",
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
  },
  {
    "inputs": [{"internalType": "uint256","name": "_id","type": "uint256"}],
    "name": "getCertificate",
    "outputs": [
      {"internalType": "uint256","name": "id","type": "uint256"},
      {"internalType": "string","name": "fullName","type": "string"},
      {"internalType": "string","name": "courseTitle","type": "string"},
      {"internalType": "uint256","name": "date","type": "uint256"},
      {"internalType": "string","name": "grade","type": "string"},
      {"internalType": "string","name": "cid","type": "string"},
      {"internalType": "address","name": "issuer","type": "address"},
      {"internalType": "uint256","name": "createdAt","type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "certificateCount",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];
