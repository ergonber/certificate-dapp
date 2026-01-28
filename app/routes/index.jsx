import { useState } from 'react';

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
  const [account, setAccount] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // CONFIGURACIÓN DIRECTA (sin imports)
  const CONTRACT_ADDRESS = "0xAe48Ed8cD53e6e595E857872b1ac338E17F08549";
  const SONIC_RPC_URL = "https://rpc.testnet.soniclabs.com";
  const SONIC_CHAIN_ID = 14601;
  const EXPLORER_URL = "https://testnet.soniclabs.com";

  // ABI SIMPLIFICADO (solo lo necesario)
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

  const sonicTestnetConfig = {
    chainId: '0x3909',
    chainName: 'Sonic Testnet',
    nativeCurrency: {
      name: 'Sonic',
      symbol: 'S',
      decimals: 18,
    },
    rpcUrls: [SONIC_RPC_URL],
    blockExplorerUrls: [EXPLORER_URL],
  };

  // Conectar wallet - versión SIMPLE que funciona
  const connectWallet = async () => {
    if (!window.ethereum && !window.rabby) {
      alert('Instala Rabby Wallet desde rabby.io');
      return;
    }

    setIsConnecting(true);
    try {
      const provider = window.rabby || window.ethereum;
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      
      // Cambiar a Sonic Testnet
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x3909' }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [sonicTestnetConfig],
          });
        }
      }
    } catch (error) {
      console.log('Error conectando:', error);
    }
    setIsConnecting(false);
  };

  // Crear certificado - versión SIMPLE
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
        message: '✅ ¡Certificado registrado exitosamente!',
        transactionHash: txResult.transactionHash,
        explorerUrl: `${EXPLORER_URL}/tx/${txResult.transactionHash}`
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

  // HTML SIMPLE
  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <header style={{
        textAlign: 'center',
        background: '#2c5530',
        color: 'white',
        padding: '30px',
        borderRadius: '15px',
        marginBottom: '30px'
      }}>
        <h1 style={{ marginBottom: '10px' }}>🎓 Registro de Certificados</h1>
        <p>Crea certificados inmutables en Sonic Testnet</p>
        
        <div style={{ marginTop: '20px' }}>
          {!account ? (
            <button 
              onClick={connectWallet}
              disabled={isConnecting}
              style={{
                padding: '12px 24px',
                background: '#f6851b',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {isConnecting ? 'Conectando...' : '🔗 Conectar Wallet'}
            </button>
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '15px',
              borderRadius: '10px'
            }}>
              <div style={{ marginBottom: '5px' }}>
                <span style={{
                  background: 'rgba(255,255,255,0.2)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontWeight: 'bold'
                }}>
                  👤 {account.slice(0, 6)}...{account.slice(-4)}
                </span>
              </div>
              <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>🌐 Sonic Testnet</p>
            </div>
          )}
        </div>
      </header>

      <main>
        {!account ? (
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '15px',
            textAlign: 'center'
          }}>
            <h2>🔗 Conecta tu Wallet</h2>
            <p>Para registrar certificados, conecta Rabby Wallet</p>
            <button 
              onClick={connectWallet}
              style={{
                padding: '15px 30px',
                background: '#f6851b',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.1rem',
                marginTop: '20px'
              }}
            >
              🔗 Conectar Wallet
            </button>
          </div>
        ) : (
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '15px'
          }}>
            <form onSubmit={createCertificate}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
                  👤 Nombre Completo *
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Ej: Juan Pérez González"
                  required
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
                  📚 Curso o Título *
                </label>
                <input
                  type="text"
                  name="courseTitle"
                  value={formData.courseTitle}
                  onChange={handleInputChange}
                  placeholder="Ej: Curso de Desarrollo Web3"
                  required
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
                  📅 Fecha del Certificado *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
                  ⭐ Nota o Calificación *
                </label>
                <input
                  type="text"
                  name="grade"
                  value={formData.grade}
                  onChange={handleInputChange}
                  placeholder="Ej: 95/100, A+, Sobresaliente"
                  required
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
                  🔗 CID del Título (IPFS/Arweave) *
                </label>
                <input
                  type="text"
                  name="cid"
                  value={formData.cid}
                  onChange={handleInputChange}
                  placeholder="Ej: QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
                  required
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px'
                  }}
                />
              </div>

              <button 
                type="submit"
                disabled={loading || !formData.fullName || !formData.courseTitle || !formData.date || !formData.grade || !formData.cid}
                style={{
                  width: '100%',
                  padding: '15px 20px',
                  background: 'linear-gradient(135deg, #2c5530 0%, #1e3a23 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Registrando...' : '🚀 Registrar en Blockchain'}
              </button>
            </form>

            {transactionStatus && (
              <div style={{
                marginTop: '30px',
                padding: '25px',
                borderRadius: '12px',
                borderLeft: '5px solid',
                background: transactionStatus.success ? '#e8f5e9' : '#ffebee',
                borderColor: transactionStatus.success ? '#2c5530' : '#d32f2f'
              }}>
                <h3 style={{ marginTop: 0 }}>
                  {transactionStatus.success ? '✅ ¡Certificado Registrado!' : '❌ Error'}
                </h3>
                <p>{transactionStatus.message}</p>
                
                {transactionStatus.success && (
                  <div style={{ marginTop: '20px' }}>
                    <p><strong>Hash de transacción:</strong></p>
                    <code style={{
                      display: 'block',
                      background: 'white',
                      padding: '10px',
                      borderRadius: '6px',
                      wordBreak: 'break-all',
                      marginBottom: '10px'
                    }}>
                      {transactionStatus.transactionHash}
                    </code>
                    <a 
                      href={transactionStatus.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        background: '#2c5530',
                        color: 'white',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        textDecoration: 'none'
                      }}
                    >
                      🔍 Ver en Sonic Explorer
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
