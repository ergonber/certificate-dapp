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
  const [errorDetails, setErrorDetails] = useState('');

  // CONFIGURACIÓN DIRECTA
  const CONTRACT_ADDRESS = "0xAe48Ed8cD53e6e595E857872b1ac338E17F08549";
  const SONIC_RPC_URL = "https://rpc.testnet.soniclabs.com";
  const SONIC_CHAIN_ID = 14601;
  const EXPLORER_URL = "https://testnet.soniclabs.com";

  // ABI SIMPLIFICADO
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

  // CONECTAR WALLET - SIMPLE
  const connectWallet = async () => {
    if (!window.ethereum && !window.rabby) {
      alert('Por favor instala Rabby Wallet desde rabby.io');
      window.open('https://rabby.io', '_blank');
      return;
    }

    setIsConnecting(true);
    try {
      const provider = window.rabby || window.ethereum;
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      
      // Cambiar a Sonic Testnet si es necesario
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

  // CREAR CERTIFICADO
  const createCertificate = async (e) => {
    e.preventDefault();
    
    if (!account) {
      alert('Por favor conecta tu wallet primero');
      return;
    }

    // Validar campos
    if (!formData.fullName || !formData.courseTitle || !formData.date || !formData.grade || !formData.cid) {
      alert('Por favor completa todos los campos');
      return;
    }

    // Validar fecha
    const dateObj = new Date(formData.date);
    if (isNaN(dateObj.getTime())) {
      alert('Fecha inválida. Por favor selecciona una fecha válida');
      return;
    }

    setLoading(true);
    setTransactionStatus(null);
    setErrorDetails('');

    try {
      const provider = window.rabby || window.ethereum;
      const Web3 = (await import('web3')).default;
      const web3 = new Web3(provider);
      const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
      
      const dateTimestamp = Math.floor(dateObj.getTime() / 1000);
      
      // ENVIAR TRANSACCIÓN CON MÁS GAS
      const txResult = await contract.methods.createCertificate(
        formData.fullName.trim(),
        formData.courseTitle.trim(),
        dateTimestamp,
        formData.grade.trim(),
        formData.cid.trim()
      ).send({
        from: account,
        gas: 150000,  // Más gas para evitar out of gas
        gasPrice: 2000000000  // 2 gwei
      });
      
      // ÉXITO
      setTransactionStatus({
        success: true,
        message: '✅ ¡Certificado registrado exitosamente en Sonic Blockchain!',
        transactionHash: txResult.transactionHash,
        explorerUrl: `${EXPLORER_URL}/tx/${txResult.transactionHash}`,
        studentName: formData.fullName,
        courseName: formData.courseTitle
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
      console.error('Error completo:', error);
      
      // ANALIZAR ERROR
      let errorMsg = 'Error al crear el certificado';
      let suggestion = '';
      
      if (error.message.includes('reverted')) {
        errorMsg = '❌ El contrato rechazó la transacción';
        suggestion = 'Posibles causas:\n• Este CID ya está registrado\n• Datos inválidos en algún campo\n• Falta algún campo requerido';
        
        // Si es el CID anterior, sugerir uno nuevo
        if (formData.cid === 'bafkreice6xjseikumhlmpb7zlmhlzz2phhek4776apjk6pks6aagmz7po4') {
          suggestion += '\n\n⚠️ Este CID ya fue usado. Prueba con uno nuevo: bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xkdg3hqhx7k5z4jv6mtglahq';
        }
      } else if (error.message.includes('insufficient funds')) {
        errorMsg = '❌ Fondos insuficientes';
        suggestion = 'Necesitas tokens S (Sonic) para pagar el gas.\nObtén en: https://faucet.testnet.soniclabs.com';
      } else if (error.code === 4001) {
        errorMsg = '❌ Transacción cancelada por el usuario';
      }
      
      setErrorDetails(suggestion);
      setTransactionStatus({
        success: false,
        message: errorMsg
      });
    }

    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    if (isNaN(date.getTime())) return '';
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
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      minHeight: '100vh'
    }}>
      <header style={{
        textAlign: 'center',
        marginBottom: '40px',
        padding: '30px',
        background: 'linear-gradient(135deg, #2c5530 0%, #1e3a23 100%)',
        color: 'white',
        borderRadius: '15px',
        boxShadow: '0 4px 20px rgba(44, 85, 48, 0.3)'
      }}>
        <h1 style={{ marginBottom: '10px', fontSize: '2.5rem' }}>🎓 Registro de Certificados en Sonic</h1>
        <p style={{ opacity: 0.9 }}>Crea certificados inmutables en la blockchain de Sonic Testnet</p>
        
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
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isConnecting ? 'Conectando...' : '🔗 Conectar Wallet'}
            </button>
          ) : (
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '15px',
              borderRadius: '10px',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                marginBottom: '5px'
              }}>
                <span style={{
                  background: 'rgba(255, 255, 255, 0.2)',
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
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ textAlign: 'center' }}>
              <h2>🔗 Conecta tu Wallet</h2>
              <p>Para registrar certificados en Sonic, necesitas conectar tu wallet</p>
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
              <p style={{ marginTop: '15px', fontSize: '0.9rem', opacity: 0.8 }}>
                Recomendado: <strong>Rabby Wallet</strong> para mejor compatibilidad con Sonic
              </p>
            </div>
          </div>
        ) : (
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            marginBottom: '30px'
          }}>
            <form onSubmit={createCertificate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="fullName" style={{
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: '#2c5530',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
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
                  style={{
                    padding: '12px 16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="courseTitle" style={{
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: '#2c5530',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
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
                  style={{
                    padding: '12px 16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="date" style={{
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: '#2c5530',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
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
                  style={{
                    padding: '12px 16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
                {formData.date && (
                  <small style={{ marginTop: '5px', color: '#2c5530', fontSize: '0.9rem', fontWeight: 500 }}>
                    📅 Se registrará como: {formatDateForDisplay(formData.date)}
                  </small>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="grade" style={{
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: '#2c5530',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
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
                  style={{
                    padding: '12px 16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="cid" style={{
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: '#2c5530',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
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
                  style={{
                    padding: '12px 16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
                <small style={{ marginTop: '5px', color: '#6c757d', fontSize: '0.85rem' }}>
                  Sube tu documento a IPFS o Arweave y pega el CID aquí
                </small>
              </div>

              <button 
                type="submit"
                disabled={loading || !isFormValid()}
                style={{
                  padding: '15px 20px',
                  background: 'linear-gradient(135deg, #2c5530 0%, #1e3a23 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  marginTop: '10px',
                  opacity: (loading || !isFormValid()) ? 0.7 : 1
                }}
              >
                {loading ? 'Registrando en Sonic...' : '🚀 Registrar en Blockchain'}
              </button>
            </form>

            {transactionStatus && (
              <div style={{
                marginTop: '30px',
                padding: '25px',
                borderRadius: '12px',
                borderLeft: '5px solid',
                background: transactionStatus.success ? '#e8f5e9' : '#ffebee',
                borderColor: transactionStatus.success ? '#2c5530' : '#d32f2f',
                color: transactionStatus.success ? '#1e3a23' : '#b71c1c',
                animation: 'fadeIn 0.5s ease'
              }}>
                <div style={{ marginBottom: '15px' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '1.5rem' }}>
                    {transactionStatus.success ? '✅ ¡Certificado Registrado!' : '❌ Error'}
                  </h3>
                  <p>{transactionStatus.message}</p>
                </div>
                
                {transactionStatus.success ? (
                  <div>
                    <div style={{
                      background: 'rgba(44, 85, 48, 0.1)',
                      padding: '15px',
                      borderRadius: '8px',
                      marginBottom: '20px'
                    }}>
                      <p>🎉 ¡Felicidades! Tu certificado ahora es inmutable en la blockchain de Sonic.</p>
                      <p>🔗 <strong>Guarda este hash para verificar:</strong></p>
                    </div>
                    
                    <div style={{
                      background: 'white',
                      padding: '20px',
                      borderRadius: '10px',
                      border: '2px solid #e0e0e0',
                      margin: '20px 0'
                    }}>
                      <div style={{ marginBottom: '15px' }}>
                        <strong>🔗 Hash de Transacción (Sonic):</strong>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '15px',
                          marginTop: '10px',
                          padding: '12px',
                          background: '#f8f9fa',
                          borderRadius: '8px',
                          border: '1px solid #e9ecef'
                        }}>
                          <code style={{
                            fontFamily: "'Courier New', monospace",
                            fontSize: '0.9rem',
                            color: '#2c5530',
                            wordBreak: 'break-all',
                            flex: 1
                          }}>
                            {transactionStatus.transactionHash}
                          </code>
                          <button 
                            onClick={() => copyToClipboard(transactionStatus.transactionHash)}
                            style={{
                              background: '#2c5530',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            📋 Copiar
                          </button>
                        </div>
                      </div>
                      
                      <a 
                        href={transactionStatus.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          background: '#2c5530',
                          color: 'white',
                          textDecoration: 'none',
                          fontWeight: 'bold',
                          padding: '10px 20px',
                          borderRadius: '8px',
                          transition: 'all 0.3s',
                          textAlign: 'center',
                          width: '100%',
                          marginTop: '10px'
                        }}
                      >
                        🔍 Ver en Sonic Explorer →
                      </a>
                    </div>
                    
                    <div style={{
                      background: '#f8f9fa',
                      padding: '20px',
                      borderRadius: '10px',
                      margin: '20px 0'
                    }}>
                      <h4 style={{ marginTop: 0, color: '#2c5530' }}>📋 Información del Certificado</h4>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '15px',
                        marginTop: '15px'
                      }}>
                        <div style={{
                          background: 'white',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid #e9ecef'
                        }}>
                          <strong>👤 Estudiante:</strong>
                          <div>{transactionStatus.studentName}</div>
                        </div>
                        <div style={{
                          background: 'white',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid #e9ecef'
                        }}>
                          <strong>📚 Curso:</strong>
                          <div>{transactionStatus.courseName}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {errorDetails && (
                      <div style={{
                        background: '#fff3cd',
                        padding: '15px',
                        borderRadius: '8px',
                        marginTop: '15px',
                        whiteSpace: 'pre-line'
                      }}>
                        <strong>💡 Sugerencias:</strong>
                        <div style={{ marginTop: '10px' }}>{errorDetails}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{
          background: 'white',
          padding: '25px',
          borderRadius: '15px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          marginTop: '30px'
        }}>
         <h3>🔧 Información Técnica</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginTop: '15px'
          }}>
            <div style={{
              background: 'white',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <strong>Blockchain:</strong> Sonic Testnet
            </div>
            <div style={{
              background: 'white',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <strong>ChainID:</strong> 14601
            </div>
            <div style={{
              background: 'white',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <strong>Estado:</strong> 
              <span style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                background: account ? '#d4edda' : '#f8d7da',
                color: account ? '#155724' : '#721c24',
                marginLeft: '5px'
              }}>
                {account ? '✅ Conectado' : '🔌 Desconectado'}
              </span>
            </div>
            <div style={{
              background: 'white',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <strong>Contrato:</strong> 
              <code style={{
                fontSize: '0.85rem',
                marginLeft: '5px'
              }}>
                {CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-8)}
              </code>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
