import { useState, useEffect } from 'react';

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
  const [isConnecting, setIsConnecting] = useState(false);

  const CONTRACT_ADDRESS = "0xAe48Ed8cD53e6e595E857872b1ac338E17F08549";
  const SONIC_RPC_URL = "https://rpc.testnet.soniclabs.com";

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
      "inputs": [],
      "name": "certificateCount",
      "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  const sonicTestnetConfig = {
    chainId: '0x3909',
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
    const checkWallet = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
          }
        } catch (error) {
          console.log('No wallet connected');
        }
      }
    };
    checkWallet();
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Por favor instala Rabby Wallet para usar esta aplicación');
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== '0x3909') {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x3909' }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [sonicTestnetConfig],
            });
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
    setIsConnecting(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const createCertificate = async (e) => {
    e.preventDefault();
    
    if (!account) {
      alert('Por favor conecta tu wallet primero');
      return;
    }

    if (!formData.fullName || !formData.courseTitle || !formData.date || !formData.grade || !formData.cid) {
      alert('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    setTransactionStatus(null);

    try {
      const Web3 = (await import('web3')).default;
      const web3 = new Web3(window.ethereum);
      const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
      
      const dateTimestamp = Math.floor(new Date(formData.date).getTime() / 1000);
      
      const gasPrice = await web3.eth.getGasPrice();
      const gasEstimate = await contract.methods.createCertificate(
        formData.fullName,
        formData.courseTitle,
        dateTimestamp,
        formData.grade,
        formData.cid
      ).estimateGas({ from: account });
      
      const gasLimit = Math.floor(Number(gasEstimate) * 1.2);
      
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
      
      setTransactionStatus({
        success: true,
        message: '🎉 ¡Certificado registrado exitosamente en Sonic Blockchain!',
        transactionHash: txResult.transactionHash,
        explorerUrl: `https://testnet.soniclabs.com/tx/${txResult.transactionHash}`,
        studentName: formData.fullName,
        courseName: formData.courseTitle
      });

      setFormData({ fullName: '', courseTitle: '', date: '', grade: '', cid: '' });

    } catch (error) {
      console.error('Error:', error);
      setTransactionStatus({
        success: false,
        message: error.message.includes('rejected') ? 'Transacción rechazada' : 'Error al crear certificado'
      });
    }

    setLoading(false);
  };

  const isFormValid = () => {
    return formData.fullName && formData.courseTitle && formData.date && formData.grade && formData.cid;
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
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
            <button onClick={connectWallet} className="connect-btn" disabled={isConnecting}>
              {isConnecting ? 'Conectando...' : '🔗 Conectar Rabby Wallet'}
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
              <p>Para registrar certificados en Sonic, necesitas conectar Rabby Wallet</p>
              <button onClick={connectWallet} className="connect-btn large">
                🔗 Conectar Rabby Wallet
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
                <label htmlFor="fullName">👤 Nombre Completo *</label>
                <input type="text" id="fullName" name="fullName" value={formData.fullName} onChange={handleInputChange} placeholder="Ej: Juan Pérez González" required disabled={loading} />
              </div>

              <div className="form-group">
                <label htmlFor="courseTitle">📚 Curso o Título *</label>
                <input type="text" id="courseTitle" name="courseTitle" value={formData.courseTitle} onChange={handleInputChange} placeholder="Ej: Curso de Desarrollo Web3" required disabled={loading} />
              </div>

              <div className="form-group">
                <label htmlFor="date">📅 Fecha del Certificado *</label>
                <input type="date" id="date" name="date" value={formData.date} onChange={handleInputChange} required disabled={loading} max={new Date().toISOString().split('T')[0]} />
                {formData.date && <small className="date-display">📅 Se registrará como: {formatDateForDisplay(formData.date)}</small>}
              </div>

              <div className="form-group">
                <label htmlFor="grade">⭐ Nota o Calificación *</label>
                <input type="text" id="grade" name="grade" value={formData.grade} onChange={handleInputChange} placeholder="Ej: 95/100, A+, Sobresaliente" required disabled={loading} />
              </div>

              <div className="form-group">
                <label htmlFor="cid">🔗 CID del Título (IPFS/Arweave) *</label>
                <input type="text" id="cid" name="cid" value={formData.cid} onChange={handleInputChange} placeholder="Ej: QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco" required disabled={loading} />
                <small className="hint">Sube tu documento a IPFS o Arweave y pega el CID aquí</small>
              </div>

              <button type="submit" className="submit-btn" disabled={loading || !isFormValid()}>
                {loading ? 'Registrando en Sonic...' : '🚀 Registrar en Blockchain'}
              </button>
            </form>

            {transactionStatus && (
              <div className={`transaction-result ${transactionStatus.success ? 'success' : 'error'}`}>
                <div className="result-header">
                  <h3>{transactionStatus.success ? '✅ ¡Certificado Registrado!' : '❌ Error'}</h3>
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
                          <button onClick={() => copyToClipboard(transactionStatus.transactionHash)} className="copy-btn">📋 Copiar</button>
                        </div>
                      </div>
                      
                      <a href={transactionStatus.explorerUrl} target="_blank" rel="noopener noreferrer" className="explorer-link">🔍 Ver en Sonic Explorer →</a>
                    </div>
                    
                    <div className="certificate-info">
                      <h4>📋 Información del Certificado</h4>
                      <div className="info-grid">
                        <div className="info-item"><strong>👤 Estudiante:</strong><span>{transactionStatus.studentName}</span></div>
                        <div className="info-item"><strong>📚 Curso:</strong><span>{transactionStatus.courseName}</span></div>
                      </div>
                    </div>
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
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="system-info">
          <h3>🔧 Información Técnica</h3>
          <div className="info-grid">
            <div className="info-item"><strong>Blockchain:</strong> Sonic Testnet</div>
            <div className="info-item"><strong>ChainID:</strong> 14601</div>
            <div className="info-item"><strong>Estado:</strong> <span className={`status ${account ? 'connected' : 'disconnected'}`}>{account ? '✅ Conectado' : '🔌 Desconectado'}</span></div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .container { max-width: 800px; margin: 0 auto; padding: 20px; font-family: -apple-system, sans-serif; min-height: 100vh; }
        header { text-align: center; margin-bottom: 40px; padding: 30px; background: linear-gradient(135deg, #2c5530 0%, #1e3a23 100%); color: white; border-radius: 15px; }
        h1 { margin-bottom: 10px; font-size: 2.5rem; }
        .connect-btn { padding: 12px 24px; background: #f6851b; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .connect-btn:hover:not(:disabled) { background: #e2761b; }
        .connect-btn:disabled { opacity: 0.7; }
        .connect-btn.large { padding: 15px 30px; font-size: 1.1rem; }
        .wallet-info { background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 10px; }
        .account-address { background: rgba(255, 255, 255, 0.2); padding: 8px 16px; border-radius: 20px; }
        .not-connected { background: white; padding: 40px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center; }
        .form-container { background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin-bottom: 30px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        label { font-weight: 600; color: #2c5530; }
        input { padding: 12px 16px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 16px; }
        input:focus { outline: none; border-color: #2c5530; }
        input:disabled { background: #f8f9fa; }
        .submit-btn { padding: 15px 20px; background: linear-gradient(135deg, #2c5530 0%, #1e3a23 100%); color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; width: 100%; }
        .submit-btn:hover:not(:disabled) { transform: translateY(-2px); }
        .submit-btn:disabled { background: #6c757d; }
        .transaction-result { margin-top: 30px; padding: 25px; border-radius: 12px; border-left: 5px solid; }
        .transaction-result.success { background: #e8f5e9; border-color: #2c5530; }
        .transaction-result.error { background: #ffebee; border-color: #d32f2f; }
        .hash-container { display: flex; gap: 15px; margin-top: 10px; padding: 12px; background: #f8f9fa; border-radius: 8px; }
        .copy-btn { background: #2c5530; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
        .explorer-link { display: block; background: #2c5530; color: white; text-decoration: none; padding: 10px 20px; border-radius: 8px; text-align: center; margin-top: 10px; }
        @media (max-width: 768px) {
          .container { padding: 15px; }
          header { padding: 20px; }
          h1 { font-size: 2rem; }
        }
      `}</style>
    </div>
  );
}
