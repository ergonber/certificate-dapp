import { useState, useEffect } from 'react';
import { CONTRACT_CONFIG, CONTRACT_ABI } from '../utils/contracts.js';

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
  const CONTRACT_ADDRESS = 0xAe48Ed8cD53e6e595E857872b1ac338E17F08549;
  const SONIC_RPC_URL = CONTRACT_CONFIG.SONIC_RPC_URL;
  const SONIC_CHAIN_ID = CONTRACT_CONFIG.CHAIN_ID;

  const sonicTestnetConfig = {
    chainId: '0x3909',
    chainName: 'Sonic Testnet',
    nativeCurrency: {
      name: 'Sonic',
      symbol: 'S',
      decimals: 18,
    },
    rpcUrls: [SONIC_RPC_URL],
    blockExplorerUrls: [CONTRACT_CONFIG.EXPLORER_URL],
  };

  // ABI completo del contrato CertificateRegistry
  const CONTRACT_ABI_COMPLETE = [
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
      "name": "owner",
      "outputs": [{"internalType": "address","name": "","type": "address"}],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      checkWalletConnection();
      
      if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
      }
    }

    return () => {
      if (typeof window !== 'undefined' && window.ethereum) {
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
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts' 
        });
        
        if (accounts.length > 0) {
          const Web3 = (await import('web3')).default;
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
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('Por favor instala MetaMask o Rabby Wallet para usar esta aplicación');
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      const Web3 = (await import('web3')).default;
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
          throw new Error('No se pudo agregar Sonic Testnet');
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

    if (!formData.fullName || !formData.courseTitle || !formData.date || !formData.grade || !formData.cid) {
      alert('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    setTransactionStatus(null);
    setCertificateId(null);

    try {
      console.log("🚀 Iniciando creación de certificado...");
      
      const contract = new web3.eth.Contract(CONTRACT_ABI_COMPLETE, CONTRACT_ADDRESS);
      
      const dateTimestamp = formData.date ? Math.floor(new Date(formData.date).getTime() / 1000) : 0;
      
      console.log("📝 Datos a enviar:", {
        fullName: formData.fullName,
        courseTitle: formData.courseTitle,
        date: dateTimestamp,
        grade: formData.grade,
        cid: formData.cid
      });

      // Obtener precio del gas
      const gasPrice = await web3.eth.getGasPrice();
      
      // Estimar gas
      let gasEstimate;
      try {
        gasEstimate = await contract.methods.createCertificate(
          formData.fullName,
          formData.courseTitle,
          dateTimestamp,
          formData.grade,
          formData.cid
        ).estimateGas({ from: account });
      } catch (estimationError) {
        console.error("Error estimando gas:", estimationError);
        throw new Error("Error al estimar gas. Verifica los datos.");
      }
      
      // Calcular gas limit con buffer
      const gasEstimateNum = Number(gasEstimate);
      const gasLimit = Math.floor(gasEstimateNum * 1.2);
      
      console.log("💰 Gas Price:", gasPrice);
      console.log("⛽ Gas Estimate:", gasEstimateNum);
      console.log("📊 Gas Limit con buffer:", gasLimit);
      
      // ENVIAR TRANSACCIÓN
      const txResult = await contract.methods.createCertificate(
        formData.fullName,
        formData.courseTitle,
        dateTimestamp,
        formData.grade,
        formData.cid
      ).send({
        from: account,
        gas: gasLimit.toString(),
        gasPrice: gasPrice
      });
      
      console.log("✅ Transacción enviada:", txResult.transactionHash);
      
      // EXTRAER DATOS DE LA TRANSACCIÓN
      const transactionHash = txResult.transactionHash;
      const blockNumber = txResult.blockNumber;
      
      // Obtener ID del certificado
      let newCertificateId = null;
      
      try {
        // Intentar obtener del contador del contrato
        const count = await contract.methods.certificateCount().call();
        newCertificateId = Number(count);
        setCertificateId(newCertificateId);
        console.log("🎯 ID del certificado:", newCertificateId);
      } catch (error) {
        console.log("⚠️ No se pudo obtener el ID automáticamente");
        newCertificateId = Date.now();
      }

      // Crear objeto de estado
      const successStatus = {
        success: true,
        message: '🎉 ¡Certificado registrado exitosamente en Sonic Blockchain!',
        transactionHash: transactionHash,
        certificateId: newCertificateId,
        blockNumber: blockNumber,
        explorerUrl: `${CONTRACT_CONFIG.EXPLORER_URL}/tx/${transactionHash}`,
        contractUrl: `${CONTRACT_CONFIG.EXPLORER_URL}/address/${CONTRACT_ADDRESS}`,
        studentName: formData.fullName,
        courseName: formData.courseTitle
      };

      // Actualizar estado usando setTimeout para evitar errores de React
      setTimeout(() => {
        setTransactionStatus(successStatus);
      }, 0);

      // Limpiar formulario
      setTimeout(() => {
        setFormData({
          fullName: '',
          courseTitle: '',
          date: '',
          grade: '',
          cid: ''
        });
      }, 100);

    } catch (error) {
      console.error("💥 ERROR:", error);
      
      let errorMessage = "Error al crear el certificado";
      
      if (error.code === 4001) {
        errorMessage = "Transacción rechazada por el usuario";
      } else if (error.message && error.message.includes("insufficient funds")) {
        errorMessage = "Fondos insuficientes para pagar el gas";
      } else if (error.message && error.message.includes("execution reverted")) {
        errorMessage = "El contrato rechazó la transacción";
      } else if (error.message && error.message.includes("already registered")) {
        errorMessage = "Este CID ya está registrado en la blockchain";
      } else if (error.message && error.message.includes("transaction is not defined")) {
        errorMessage = "Error interno en la aplicación. La transacción fue exitosa pero hubo un problema al mostrar los datos.";
      }

      setTimeout(() => {
        setTransactionStatus({
          success: false,
          message: errorMessage,
          error: error.message || "Error desconocido"
        });
      }, 0);
    }

    setTimeout(() => {
      setLoading(false);
    }, 0);
  };

  const isFormValid = () => {
    const dateObj = new Date(formData.date);
    return formData.fullName && 
           formData.courseTitle && 
           formData.date && 
           !isNaN(dateObj.getTime()) &&
           formData.grade && 
           formData.cid;
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('¡Copiado al portapapeles!');
    });
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
                '🔗 Conectar Wallet'
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
              <p>Para registrar certificados en Sonic, necesitas conectar tu wallet</p>
              <button onClick={connectWallet} className="connect-btn large">
                🔗 Conectar Wallet
              </button>
              <p className="wallet-hint">
                Recomendado: <strong>Rabby Wallet</strong> para mejor compatibilidad con Sonic
              </p>
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
                  max={new Date().toISOString().split('T')[0]}
                />
                {formData.date && (
                  <small className="date-display">
                    📅 Se registrará como: {formatDateForDisplay(formData.date)}
                  </small>
                )}
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
                    {transactionStatus.success ? '✅ ¡Certificado Registrado!' : '❌ Error'}
                  </h3>
                  <p>{transactionStatus.message}</p>
                </div>
                
                {transactionStatus.success && (
                  <div className="transaction-details">
                    <div className="success-message">
                      <p>🎉 ¡Felicidades! Tu certificado ahora es inmutable en la blockchain de Sonic.</p>
                      <p>🔗 <strong>Guarda este hash para verificar:</strong></p>
                    </div>
                    
                    <div className="hash-section">
                      <div className="hash-display">
                        <strong>🔗 Hash de Transacción (Sonic):</strong>
                        <div className="hash-container">
                          <code className="sonic-hash">{transactionStatus.transactionHash}</code>
                          <button 
                            onClick={() => copyToClipboard(transactionStatus.transactionHash)}
                            className="copy-btn"
                          >
                            📋 Copiar
                          </button>
                        </div>
                      </div>
                      
                      <a 
                        href={transactionStatus.explorerUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="explorer-link"
                      >
                        🔍 Ver en Sonic Explorer →
                      </a>
                    </div>
                    
                    <div className="certificate-info">
                      <h4>📋 Información del Certificado</h4>
                      <div className="info-grid">
                        <div className="info-item">
                          <strong>👤 Estudiante:</strong>
                          <span>{transactionStatus.studentName}</span>
                        </div>
                        <div className="info-item">
                          <strong>📚 Curso:</strong>
                          <span>{transactionStatus.courseName}</span>
                        </div>
                        {transactionStatus.certificateId && (
                          <div className="info-item">
                            <strong>🆔 ID del Certificado:</strong>
                            <span className="certificate-id">#{transactionStatus.certificateId}</span>
                          </div>
                        )}
                        {transactionStatus.blockNumber && (
                          <div className="info-item">
                            <strong>📦 Block Number:</strong>
                            <span>{transactionStatus.blockNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="verification-note">
                      <h4>🔍 Para Verificar este Certificado</h4>
                      <p>Usa el hash de transacción en tu verificador de certificados o en:</p>
                      <code className="verification-code">
                        {transactionStatus.explorerUrl}
                      </code>
                    </div>
                  </div>
                )}
                
                {!transactionStatus.success && (
                  <div className="error-suggestions">
                    <h4>💡 Sugerencias:</h4>
                    <ul>
                      <li>Verifica que tu wallet tenga fondos S (Sonic Testnet)</li>
                      <li>Asegúrate de estar conectado a Sonic Testnet (ChainID: 14601)</li>
                      <li>Intenta con Rabby Wallet si usas MetaMask</li>
                      <li>Revisa que el CID no esté ya registrado</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="info-section">
              <h3>💡 Cómo Funciona</h3>
              <div className="info-grid">
                <div className="info-card">
                  <h4>✅ ¿Qué pasa después de registrar?</h4>
                  <ul>
                    <li>Recibirás un <strong>hash único de Sonic</strong></li>
                    <li>El certificado será <strong>inmutable en blockchain</strong></li>
                    <li>Podrás verificar el certificado en cualquier momento</li>
                    <li>Los datos estarán disponibles permanentemente</li>
                  </ul>
                </div>
                
                <div className="info-card">
                  <h4>🔍 Cómo Verificar</h4>
                  <p>Después del registro, usa el hash proporcionado en:</p>
                  <ul>
                    <li>Tu propio verificador de certificados</li>
                    <li>Explorer de Sonic Testnet</li>
                    <li>Cualquier herramienta que se conecte a Sonic</li>
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
              <strong>ChainID:</strong> {SONIC_CHAIN_ID}
            </div>
            <div className="info-item">
              <strong>Estado:</strong> 
              <span className={`status ${account ? 'connected' : 'disconnected'}`}>
                {account ? '✅ Conectado' : '🔌 Desconectado'}
              </span>
            </div>
            <div className="info-item">
              <strong>Contrato:</strong> 
              <code>{CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-8)}</code>
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
        
        .wallet-hint {
          margin-top: 15px;
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
        
        .date-display {
          margin-top: 5px;
          color: #2c5530;
          font-size: 0.9rem;
          font-weight: 500;
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
          padding: 25px;
          border-radius: 12px;
          border-left: 5px solid;
          animation: fadeIn 0.5s ease;
        }
        
        .transaction-result.success {
          background: #e8f5e9;
          border-color: #2c5530;
          color: #1e3a23;
        }
        
        .transaction-result.error {
          background: #ffebee;
          border-color: #d32f2f;
          color: #b71c1c;
        }
        
        .result-header h3 {
          margin: 0 0 10px 0;
          font-size: 1.5rem;
        }
        
        .success-message {
          background: rgba(44, 85, 48, 0.1);
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        
        .success-message p {
          margin: 8px 0;
        }
        
        .hash-section {
          background: white;
          padding: 20px;
          border-radius: 10px;
          border: 2px solid #e0e0e0;
          margin: 20px 0;
        }
        
        .hash-display {
          margin-bottom: 15px;
        }
        
        .hash-container {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-top: 10px;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }
        
        .sonic-hash {
          font-family: 'Courier New', monospace;
          font-size: 0.9rem;
          color: #2c5530;
          word-break: break-all;
          flex: 1;
        }
        
        .copy-btn {
          background: #2c5530;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s;
          white-space: nowrap;
        }
        
        .copy-btn:hover {
          background: #1e3a23;
          transform: translateY(-2px);
        }
        
        .explorer-link {
          display: inline-block;
          background: #2c5530;
          color: white;
          text-decoration: none;
          font-weight: bold;
          padding: 10px 20px;
          border-radius: 8px;
          transition: all 0.3s;
          text-align: center;
          width: 100%;
          margin-top: 10px;
        }
        
        .explorer-link:hover {
          background: #1e3a23;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(44, 85, 48, 0.3);
        }
        
        .certificate-info {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
        }
        
        .certificate-info h4 {
          margin-top: 0;
          color: #2c5530;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }
        
        .info-item {
          background: white;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }
        
        .certificate-id {
          background: #2c5530;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: bold;
          font-family: 'Courier New', monospace;
        }
        
        .verification-note {
          background: #e3f2fd;
          padding: 20px;
          border-radius: 10px;
          border-left: 4px solid #1976d2;
          margin-top: 20px;
        }
        
        .verification-note h4 {
          margin-top: 0;
          color: #1565c0;
        }
        
        .verification-code {
          display: block;
          background: white;
          padding: 10px;
          border-radius: 6px;
          font-family: 'Courier New', monospace;
          font-size: 0.85rem;
          margin-top: 10px;
          word-break: break-all;
          border: 1px solid #bbdefb;
        }
        
        .error-suggestions {
          background: #fff3e0;
          padding: 20px;
          border-radius: 10px;
          margin-top: 20px;
          border-left: 4px solid #f57c00;
        }
        
        .error-suggestions h4 {
          margin-top: 0;
          color: #e65100;
        }
        
        .error-suggestions ul {
          padding-left: 20px;
          margin: 10px 0;
        }
        
        .error-suggestions li {
          margin-bottom: 8px;
        }
        
        .info-section {
          margin-top: 40px;
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
        
        .status.disconnected {
          background: #f8d7da;
          color: #721c24;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
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
          
          .hash-container {
            flex-direction: column;
            align-items: stretch;
          }
          
          .copy-btn {
            width: 100%;
          }
          
          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
