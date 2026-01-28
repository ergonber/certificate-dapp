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
  const [walletError, setWalletError] = useState('');

  const CONTRACT_ADDRESS = "0xAe48Ed8cD53e6e595E857872b1ac338E17F08549";

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
    }
  ];

  // FORZAR USO DE RABBY - SOLUCIÓN DEFINITIVA
  useEffect(() => {
    const fixWalletConflict = () => {
      if (typeof window === 'undefined') return;
      
      // SOLUCIÓN 1: Intentar encontrar Rabby en providers
      if (window.ethereum?.providers) {
        const rabby = window.ethereum.providers.find(p => p.isRabby);
        if (rabby) {
          window.ethereum = rabby;
          console.log("✅ Rabby Wallet detectado en providers");
          return;
        }
      }
      
      // SOLUCIÓN 2: Buscar directamente Rabby
      if (window.rabby) {
        window.ethereum = window.rabby;
        console.log("✅ Rabby Wallet detectado como window.rabby");
        return;
      }
      
      // SOLUCIÓN 3: Si hay error de conflicto, forzar reload limpio
      if (window.ethereum && !window.ethereum.isRabby) {
        console.warn("⚠️ Wallet conflict detected. Please use Rabby Wallet only.");
        setWalletError('Conflicto de wallets detectado. Usa solo Rabby Wallet.');
      }
    };
    
    fixWalletConflict();
  }, []);

  const connectWallet = async () => {
    setWalletError('');
    
     const provider = window.rabby;
  
  if (!provider) {
    alert('🔴 ERROR: No se detectó Rabby Wallet\n\nSOLUCIÓN:\n1. Instala Rabby Wallet (rabby.io)\n2. DESACTIVA MetaMask temporalmente\n3. Recarga esta página');
    window.open('https://rabby.io', '_blank');
    return;
  }
    
    // Verificar si es Rabby
    if (!provider.isRabby && !window.rabby) {
      setWalletError('⚠️ POR FAVOR: Esta aplicación requiere RABBY WALLET\n\n1. Asegúrate de tener Rabby Wallet instalado\n2. Si tienes MetaMask, desactívalo temporalmente\n3. Recarga la página después de instalar Rabby');
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      
      // Conectar a Sonic Testnet
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x3909' }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x3909',
              chainName: 'Sonic Testnet',
              nativeCurrency: { name: 'Sonic', symbol: 'S', decimals: 18 },
              rpcUrls: ['https://rpc.testnet.soniclabs.com'],
              blockExplorerUrls: ['https://testnet.soniclabs.com/']
            }],
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setWalletError('Error al conectar wallet: ' + (error.message || 'Desconocido'));
    }
    setIsConnecting(false);
  };

  const createCertificate = async (e) => {
    e.preventDefault();
    
    if (!account) {
      alert('Conecta tu wallet primero');
      return;
    }

    setLoading(true);
    setTransactionStatus(null);

    try {
      const provider = window.rabby || window.ethereum;
      const Web3 = (await import('web3')).default;
      const web3 = new Web3(provider);
      const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
      
      const dateTimestamp = Math.floor(new Date(formData.date).getTime() / 1000);
      
      const txResult = await contract.methods.createCertificate(
        formData.fullName,
        formData.courseTitle,
        dateTimestamp,
        formData.grade,
        formData.cid
      ).send({
        from: account,
        gas: 50000
      });
      
      setTransactionStatus({
        success: true,
        message: '✅ Certificado registrado exitosamente!',
        transactionHash: txResult.transactionHash,
        explorerUrl: `https://testnet.soniclabs.com/tx/${txResult.transactionHash}`
      });

      setFormData({ fullName: '', courseTitle: '', date: '', grade: '', cid: '' });

    } catch (error) {
      console.error('Error:', error);
      setTransactionStatus({
        success: false,
        message: error.message || 'Error desconocido'
      });
    }

    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isFormValid = () => {
    return formData.fullName && formData.courseTitle && formData.date && formData.grade && formData.cid;
  };

  return (
    <div className="container">
      <header>
        <h1>🎓 Registro de Certificados en Sonic</h1>
        <p>Usa <strong>Rabby Wallet</strong> para crear certificados en Sonic Testnet</p>
        
        {walletError && (
          <div className="wallet-error">
            <p>{walletError}</p>
            <button onClick={() => window.open('https://rabby.io', '_blank')} className="rabby-btn">
              📥 Descargar Rabby Wallet
            </button>
          </div>
        )}
        
        <div className="wallet-section">
          {!account ? (
            <button onClick={connectWallet} className="connect-btn" disabled={isConnecting}>
              {isConnecting ? 'Conectando...' : '🦝 Conectar Rabby Wallet'}
            </button>
          ) : (
            <div className="wallet-info">
              <div className="account-info">
                <span className="account-address">👤 {account.slice(0, 6)}...{account.slice(-4)}</span>
                <span className="wallet-badge">Rabby 🦝</span>
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
              <h2>🦝 Rabby Wallet Requerido</h2>
              <p>Para usar esta aplicación necesitas:</p>
              <ol>
                <li><strong>Instalar Rabby Wallet</strong> (gratis)</li>
                <li><strong>Desactivar MetaMask temporalmente</strong></li>
                <li><strong>Conectar Rabby Wallet</strong></li>
              </ol>
              <button onClick={connectWallet} className="connect-btn large">
                🦝 Conectar Rabby Wallet
              </button>
              <button onClick={() => window.open('https://rabby.io', '_blank')} className="download-btn">
                📥 Descargar Rabby Wallet
              </button>
            </div>
          </div>
        ) : (
          <div className="form-container">
            <form onSubmit={createCertificate} className="certificate-form">
              <div className="form-group">
                <label>👤 Nombre Completo *</label>
                <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} disabled={loading} required />
              </div>
              <div className="form-group">
                <label>📚 Curso o Título *</label>
                <input type="text" name="courseTitle" value={formData.courseTitle} onChange={handleInputChange} disabled={loading} required />
              </div>
              <div className="form-group">
                <label>📅 Fecha *</label>
                <input type="date" name="date" value={formData.date} onChange={handleInputChange} disabled={loading} required />
              </div>
              <div className="form-group">
                <label>⭐ Nota *</label>
                <input type="text" name="grade" value={formData.grade} onChange={handleInputChange} disabled={loading} required />
              </div>
              <div className="form-group">
                <label>🔗 CID (IPFS/Arweave) *</label>
                <input type="text" name="cid" value={formData.cid} onChange={handleInputChange} disabled={loading} required />
              </div>
              <button type="submit" className="submit-btn" disabled={loading || !isFormValid()}>
                {loading ? 'Registrando...' : '🚀 Registrar en Blockchain'}
              </button>
            </form>

            {transactionStatus && (
              <div className={`transaction-result ${transactionStatus.success ? 'success' : 'error'}`}>
                <h3>{transactionStatus.success ? '✅ Éxito' : '❌ Error'}</h3>
                <p>{transactionStatus.message}</p>
                {transactionStatus.success && (
                  <div>
                    <p>Hash: {transactionStatus.transactionHash}</p>
                    <a href={transactionStatus.explorerUrl} target="_blank" rel="noopener noreferrer">
                      Ver en explorer
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <style jsx>{`
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        header { text-align: center; background: #1a1a1a; color: white; padding: 30px; border-radius: 15px; margin-bottom: 30px; }
        .wallet-error { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .rabby-btn { background: #8B5CF6; color: white; border: none; padding: 10px 20px; border-radius: 8px; margin-top: 10px; cursor: pointer; }
        .connect-btn { background: #8B5CF6; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .connect-btn:hover { background: #7C3AED; }
        .connect-btn.large { padding: 15px 30px; font-size: 1.1rem; }
        .download-btn { background: #10B981; color: white; border: none; padding: 15px 30px; border-radius: 8px; margin-top: 10px; cursor: pointer; }
        .wallet-badge { background: #8B5CF6; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; margin-left: 10px; }
        .not-connected { text-align: center; padding: 40px; background: white; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        ol { text-align: left; display: inline-block; margin: 20px auto; }
        li { margin-bottom: 10px; }
        .form-container { background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .form-group { margin-bottom: 20px; }
        label { display: block; font-weight: bold; margin-bottom: 8px; }
        input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; }
        .submit-btn { background: #2c5530; color: white; border: none; padding: 15px; border-radius: 8px; width: 100%; font-size: 16px; cursor: pointer; }
        .submit-btn:disabled { background: #ccc; }
        .transaction-result { padding: 20px; border-radius: 10px; margin-top: 20px; }
        .transaction-result.success { background: #d4edda; border: 1px solid #c3e6cb; }
        .transaction-result.error { background: #f8d7da; border: 1px solid #f5c6cb; }
      `}</style>
    </div>
  );
}
