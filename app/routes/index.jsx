import { useState, useEffect } from 'react';
import Web3 from 'web3';

export default function CreateCertificate() {
  const [formData, setFormData] = useState({
    fullName: '',
    courseTitle: '',
    date: '',
    grade: '',
    cid: ''
  });
  const [loading, setLoading] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState(null);
  const [account, setAccount] = useState(null);
  const [web3, setWeb3] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [certificateId, setCertificateId] = useState(null);

  // CONFIGURACIÓN SONIC
  const CONTRACT_ADDRESS = "0x520C105f98873A7d622ef620954d2f284222774B"; // Actualizar después del deployment
  const SONIC_RPC_URL = "https://rpc.testnet.soniclabs.com";
  const SONIC_CHAIN_ID = 14601;

  // ABI del contrato simplificado
  const CONTRACT_ABI = [
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
      "inputs": [{"internalType": "string","name": "_cid","type": "string"}],
      "name": "verifyCertificate",
      "outputs": [{"internalType": "bool","name": "","type": "bool"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "certificateCount",
      "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [{"internalType": "address","name": "","type": "address"}],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  // Configuración de Sonic para MetaMask
  const sonicTestnetConfig = {
    chainId: '0x3909', // 14601 en hexadecimal
    chainName: 'Sonic Testnet',
    nativeCurrency: {
      name: 'Sonic',
      symbol: 'S',
      decimals: 18,
    },
    rpcUrls: [SONIC_RPC_URL],
    blockExplorerUrls: ['https://testnet.soniclabs.com/'],
  };

  useEffect(() => {
    checkWalletConnection();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      setAccount(null);
      setWeb3(null);
    } else {
      setAccount(accounts[0]);
    }
  };

  const handleChainChanged = () => {
    window.location.reload();
  };

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts' 
        });
        
        if (accounts.length > 0) {
          const web3Instance = new Web3(window.ethereum);
          setWeb3(web3Instance);
          setAccount(accounts[0]);
        }
      } catch (error) {
        console.error('Error checking wallet:', error);
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Por favor instala MetaMask para usar esta aplicación');
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      const web3Instance = new Web3(window.ethereum);
      const currentChainId = await web3Instance.eth.getChainId();

      if (Number(currentChainId) !== SONIC_CHAIN_ID) {
        await switchToSonicNetwork();
      }

      setWeb3(web3Instance);
      setAccount(accounts[0]);

    } catch (error) {
      console.error('Error connecting wallet:', error);
      if (error.code === 4001) {
        alert('Por favor conecta tu wallet para continuar');
      }
    }
    setIsConnecting(false);
  };

  const switchToSonicNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: sonicTestnetConfig.chainId }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [sonicTestnetConfig],
          });
        } catch (addError) {
          console.error('Error adding Sonic network:', addError);
          throw new Error('No se pudo agregar Sonic Testnet a MetaMask');
        }
      } else {
        throw switchError;
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const createCertificate = async (e) => {
    e.preventDefault();
    
    if (!account || !web3) {
      alert('Por favor conecta tu wallet primero');
      return;
    }

    // Validar campos
    if (!formData.fullName || !formData.courseTitle || !formData.date || !formData.grade || !formData.cid) {
      alert('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    setTransactionStatus(null);
    setCertificateId(null);

    try {
      console.log("🚀 Iniciando creación de certificado...");
      
      const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
      
      // Convertir fecha a timestamp
      const dateTimestamp = Math.floor(new Date(formData.date).getTime() / 1000);
      
      console.log("📝 Datos a enviar:", {
        fullName: formData.fullName,
        courseTitle: formData.courseTitle,
        date: dateTimestamp,
        grade: formData.grade,
        cid: formData.cid
      });

      // Estimar gas
  try {
  // Obtener precio del gas de la red
  const gasPrice = await web3.eth.getGasPrice();
  
  // Estimar gas con un buffer más conservador
  const gasEstimate = await contract.methods.createCertificate(
    formData.fullName,
    formData.courseTitle,
    dateTimestamp,
    formData.grade,
    formData.cid
  ).estimateGas({ from: account });
  
  // Convertir BigInt a string explícitamente
  const gasLimit = (BigInt(gasEstimate) * 120n / 100n).toString(); // +20% buffer
  
  console.log("💰 Gas Price:", gasPrice);
  console.log("⛽ Gas Estimate:", gasEstimate.toString());
  console.log("📊 Gas Limit con buffer:", gasLimit);
  
  // Enviar transacción con parámetros explícitos
  const transaction = await contract.methods.createCertificate(
    formData.fullName,
    formData.courseTitle,
    dateTimestamp,
    formData.grade,
    formData.cid
  ).send({
    from: account,
    gas: gasLimit,
    gasPrice: gasPrice,
    maxFeePerGas: undefined, // Deja que MetaMask calcule esto
    maxPriorityFeePerGas: undefined // Deja que MetaMask calcule esto
  });
  
  console.log("✅ Transacción enviada:", transaction.transactionHash);
  
} catch (error) {
  console.error("❌ Error detallado:", error);
  throw error;
}
      console.log("✅ Transacción exitosa:", transaction);

      // Obtener el ID del certificado del evento
      const receipt = await web3.eth.getTransactionReceipt(transaction.transactionHash);
      console.log("📄 Receipt:", receipt);

      // Buscar el event CertificateCreated
      if (receipt.logs && receipt.logs.length > 0) {
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
            // Decodificar el evento (forma simplificada)
            const eventSignature = web3.utils.keccak256("CertificateCreated(uint256,address,string,string,uint256,string,string)");
            
            if (log.topics[0] === eventSignature) {
              // El primer topic después de la firma es el ID (indexado)
              const idHex = log.topics[1];
              const certificateId = web3.utils.hexToNumber(idHex);
              setCertificateId(certificateId);
              console.log("🎯 ID del certificado:", certificateId);
              break;
            }
          }
        }
      }

      // Si no encontramos el ID en eventos, intentar obtenerlo del contador
      if (!certificateId) {
        try {
          const count = await contract.methods.certificateCount().call();
          setCertificateId(Number(count));
          console.log("📊 ID del certificado (del contador):", count);
        } catch (error) {
          console.log("⚠️ No se pudo obtener el ID del certificado");
        }
      }

      setTransactionStatus({
        success: true,
        message: '🎉 Certificado creado exitosamente en Sonic Blockchain!',
        transactionHash: transaction.transactionHash,
        blockNumber: transaction.blockNumber,
        explorerUrl: `https://testnet.soniclabs.com/tx/${transaction.transactionHash}`,
        contractUrl: `https://testnet.soniclabs.com/address/${CONTRACT_ADDRESS}`
      });

      // Limpiar formulario
      setFormData({
        fullName: '',
        courseTitle: '',
        date: '',
        grade: '',
        cid: ''
      });

    } catch (error) {
      console.error("💥 ERROR:", error);
      
      let errorMessage = "Error al crear el certificado";
      
      if (error.code === 4001) {
        errorMessage = "Transacción rechazada por el usuario";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Fondos insuficientes para pagar el gas";
      } else if (error.message.includes("execution reverted")) {
        const revertMatch = error.message.match(/execution reverted: (.+)/);
        errorMessage = revertMatch ? `Error: ${revertMatch[1]}` : "El contrato rechazó la transacción";
      } else if (error.message.includes("already registered")) {
        errorMessage = "Este CID ya está registrado en la blockchain";
      }

      setTransactionStatus({
        success: false,
        message: errorMessage,
        error: error.message
      });
    }

    setLoading(false);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('es-ES');
  };

  const isFormValid = () => {
    return formData.fullName && 
           formData.courseTitle && 
           formData.date && 
           formData.grade && 
           formData.cid;
  };

  return (
    <div className="container">
      <header>
        <h1>🎓 Registro de Certificados en Sonic</h1>
        <p>Crea certificados inmutables en la blockchain de Sonic Testnet</p>
        
        <div className="wallet-section">
          {!account ? (
            <button 
              onClick={connectWallet} 
              className="connect-btn"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <div className="spinner-small"></div>
                  Conectando...
                </>
              ) : (
                '🔗 Conectar MetaMask'
              )}
            </button>
          ) : (
            <div className="wallet-info">
              <div className="account-info">
                <span className="account-address">
                  👤 {account.slice(0, 6)}...{account.slice(-4)}
                </span>
              </div>
              <p className="network-info">🌐 Sonic Testnet</p>
            </div>
          )}
        </div>
      </header>

      <main>
        {!account ? (
          <div className="not-connected">
            <div className="connection-prompt">
              <h2>🔗 Conecta tu Wallet</h2>
              <p>Para registrar certificados en Sonic, necesitas conectar tu wallet de MetaMask</p>
              <button onClick={connectWallet} className="connect-btn large">
                🔗 Conectar MetaMask
              </button>
            </div>
          </div>
        ) : (
          <div className="form-container">
            <form onSubmit={createCertificate} className="certificate-form">
              <div className="form-group">
                <label htmlFor="fullName">
                  👤 Nombre Completo *
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Ej: Juan Pérez González"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="courseTitle">
                  📚 Curso o Título *
                </label>
                <input
                  type="text"
                  id="courseTitle"
                  name="courseTitle"
                  value={formData.courseTitle}
                  onChange={handleInputChange}
                  placeholder="Ej: Curso de Desarrollo Web3"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="date">
                  📅 Fecha del Certificado *
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="grade">
                  ⭐ Nota o Calificación *
                </label>
                <input
                  type="text"
                  id="grade"
                  name="grade"
                  value={formData.grade}
                  onChange={handleInputChange}
                  placeholder="Ej: 95/100, A+, Sobresaliente"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="cid">
                  🔗 CID del Título (IPFS/Arweave) *
                </label>
                <input
                  type="text"
                  id="cid"
                  name="cid"
                  value={formData.cid}
                  onChange={handleInputChange}
                  placeholder="Ej: QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
                  required
                  disabled={loading}
                />
                <small className="hint">
                  Sube tu documento a IPFS o Arweave y pega el CID aquí
                </small>
              </div>

              <button 
                type="submit" 
                className="submit-btn"
                disabled={loading || !isFormValid()}
              >
                {loading ? (
                  <>
                    <div className="spinner-small"></div>
                    Registrando en Sonic...
                  </>
                ) : (
                  '🚀 Registrar en Blockchain'
                )}
              </button>
            </form>

            {transactionStatus && (
              <div className={`transaction-result ${transactionStatus.success ? 'success' : 'error'}`}>
                <div className="result-header">
                  <h3>
                    {transactionStatus.success ? '✅ Éxito' : '❌ Error'}
                  </h3>
                  <p>{transactionStatus.message}</p>
                </div>
                
                {transactionStatus.success && (
                  <div className="transaction-details">
                    {certificateId && (
                      <div className="detail-row">
                        <strong>🆔 ID del Certificado:</strong>
                        <span className="certificate-id">#{certificateId}</span>
                      </div>
                    )}
                    
                    <div className="detail-row">
                      <strong>📫 Hash de Transacción:</strong>
                      <a 
                        href={transactionStatus.explorerUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="explorer-link"
                      >
                        Ver en Sonic Explorer →
                      </a>
                    </div>
                    
                    <div className="detail-row">
                      <strong>📦 Block Number:</strong>
                      <span>{transactionStatus.blockNumber}</span>
                    </div>
                    
                    <div className="detail-row">
                      <strong>👤 Emisor:</strong>
                      <code>{account.slice(0, 10)}...{account.slice(-8)}</code>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="info-section">
              <h3>💡 Información Importante</h3>
              <div className="info-grid">
                <div className="info-card">
                  <h4>📝 Datos Requeridos</h4>
                  <ul>
                    <li>Nombre completo del estudiante</li>
                    <li>Nombre del curso o título</li>
                    <li>Fecha del certificado</li>
                    <li>Nota o calificación</li>
                    <li>CID del documento (IPFS/Arweave)</li>
                  </ul>
                </div>
                
                <div className="info-card">
                  <h4>🔗 CID del Documento</h4>
                  <p>El CID es el hash único de tu documento subido a:</p>
                  <ul>
                    <li><a href="https://web3.storage" target="_blank">Web3.Storage</a> (IPFS)</li>
                    <li><a href="https://www.arweave.org" target="_blank">Arweave</a></li>
                    <li><a href="https://pinata.cloud" target="_blank">Pinata</a> (IPFS)</li>
                  </ul>
                </div>
                
                <div className="info-card">
                  <h4>💰 Costos</h4>
                  <ul>
                    <li>Gas fee: Variable (Sonic Testnet)</li>
                    <li>No hay costos de plataforma</li>
                    <li>Necesitas S (Sonic) para gas</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="system-info">
          <h3>🔧 Información Técnica</h3>
          <div className="info-grid">
            <div className="info-item">
              <strong>Blockchain:</strong> Sonic Testnet
            </div>
            <div className="info-item">
              <strong>ChainID:</strong> 14601
            </div>
            <div className="info-item">
              <strong>Contrato:</strong> 
              <code>{CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-8)}</code>
            </div>
            <div className="info-item">
              <strong>Red:</strong> 
              <span className="status connected">✅ Conectado a Sonic</span>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          min-height: 100vh;
        }
        
        header {
          text-align: center;
          margin-bottom: 40px;
          padding: 30px;
          background: linear-gradient(135deg, #2c5530 0%, #1e3a23 100%);
          color: white;
          border-radius: 15px;
          box-shadow: 0 4px 20px rgba(44, 85, 48, 0.3);
        }
        
        h1 {
          margin-bottom: 10px;
          font-size: 2.5rem;
        }
        
        p {
          opacity: 0.9;
        }
        
        .wallet-section {
          margin-top: 20px;
        }
        
        .connect-btn {
          padding: 12px 24px;
          background: #f6851b;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s;
        }
        
        .connect-btn:hover:not(:disabled) {
          background: #e2761b;
          transform: translateY(-2px);
        }
        
        .connect-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .connect-btn.large {
          padding: 15px 30px;
          font-size: 1.1rem;
        }
        
        .wallet-info {
          background: rgba(255, 255, 255, 0.1);
          padding: 15px;
          border-radius: 10px;
          backdrop-filter: blur(10px);
        }
        
        .account-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 5px;
        }
        
        .account-address {
          background: rgba(255, 255, 255, 0.2);
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: bold;
        }
        
        .network-info {
          font-size: 0.9rem;
          opacity: 0.8;
        }
        
        .not-connected {
          background: white;
          padding: 40px;
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          text-align: center;
        }
        
        .form-container {
          background: white;
          padding: 30px;
          border-radius: 15px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        }
        
        .certificate-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
        }
        
        label {
          font-weight: 600;
          margin-bottom: 8px;
          color: #2c5530;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        input {
          padding: 12px 16px;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          font-size: 16px;
          transition: all 0.3s;
        }
        
        input:focus {
          outline: none;
          border-color: #2c5530;
          box-shadow: 0 0 0 3px rgba(44, 85, 48, 0.1);
        }
        
        input:disabled {
          background: #f8f9fa;
          cursor: not-allowed;
        }
        
        .hint {
          margin-top: 5px;
          color: #6c757d;
          font-size: 0.85rem;
        }
        
        .submit-btn {
          padding: 15px 20px;
          background: linear-gradient(135deg, #2c5530 0%, #1e3a23 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 10px;
        }
        
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(44, 85, 48, 0.3);
        }
        
        .submit-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }
        
        .spinner-small {
          border: 2px solid transparent;
          border-top: 2px solid white;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          animation: spin 1s linear infinite;
        }
        
        .transaction-result {
          margin-top: 30px;
          padding: 20px;
          border-radius: 10px;
          border-left: 4px solid;
        }
        
        .transaction-result.success {
          background: #d4edda;
          border-color: #28a745;
          color: #155724;
        }
        
        .transaction-result.error {
          background: #f8d7da;
          border-color: #dc3545;
          color: #721c24;
        }
        
        .result-header h3 {
          margin: 0 0 10px 0;
        }
        
        .transaction-details {
          background: rgba(255, 255, 255, 0.5);
          padding: 15px;
          border-radius: 8px;
          margin-top: 15px;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(0,0,0,0.1);
        }
        
        .detail-row:last-child {
          margin-bottom: 0;
          border-bottom: none;
        }
        
        .certificate-id {
          background: #2c5530;
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-weight: bold;
          font-family: 'Courier New', monospace;
        }
        
        .explorer-link {
          color: #2c5530;
          text-decoration: none;
          font-weight: bold;
          padding: 6px 12px;
          border: 2px solid #2c5530;
          border-radius: 6px;
          transition: all 0.3s;
        }
        
        .explorer-link:hover {
          background: #2c5530;
          color: white;
        }
        
        .info-section {
          margin-top: 40px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        
        .info-card {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 10px;
          border: 1px solid #e9ecef;
        }
        
        .info-card h4 {
          color: #2c5530;
          margin-bottom: 10px;
        }
        
        .info-card ul {
          padding-left: 20px;
          margin: 10px 0;
        }
        
        .info-card li {
          margin-bottom: 5px;
        }
        
        .system-info {
          background: white;
          padding: 25px;
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          margin-top: 30px;
        }
        
        .info-item {
          padding: 10px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }
        
        .status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.9rem;
          font-weight: bold;
        }
        
        .status.connected {
          background: #d4edda;
          color: #155724;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .container {
            padding: 15px;
          }
          
          header {
            padding: 20px;
          }
          
          h1 {
            font-size: 2rem;
          }
          
          .form-container {
            padding: 20px;
          }
          
          .detail-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 5px;
          }
          
          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
