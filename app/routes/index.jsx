import { useState, useEffect } from 'react';
import { CONTRACT_ABI, CONTRACT_CONFIG, SONIC_TESTNET } from '../../utils/contracts';

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
  const [errorDetails, setErrorDetails] = useState('');
  const [certificateCount, setCertificateCount] = useState(0);

  // Detectar MetaMask
  useEffect(() => {
    if (window.ethereum) {
      console.log('✅ MetaMask detectado');
      
      window.ethereum.request({ method: 'eth_accounts' })
        .then(accounts => {
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            checkNetwork();
            fetchCertificateCount();
          }
        })
        .catch(console.error);
      
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          fetchCertificateCount();
        } else {
          setAccount('');
        }
      });
      
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  // Verificar y cambiar a Sonic
  const checkNetwork = async () => {
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      if (chainId !== SONIC_TESTNET.chainId) {
        await switchToSonicNetwork();
      }
    } catch (error) {
      console.error('Error verificando red:', error);
    }
  };

  // Cambiar a Sonic
  const switchToSonicNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SONIC_TESTNET.chainId }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [SONIC_TESTNET],
          });
        } catch (addError) {
          console.error('Error agregando red:', addError);
        }
      }
    }
  };

  // Conectar MetaMask
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Por favor instala MetaMask');
      window.open('https://metamask.io', '_blank');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        await checkNetwork();
        fetchCertificateCount();
      }
    } catch (error) {
      console.error('Error conectando wallet:', error);
      setErrorDetails(`Error: ${error.message}`);
    }
  };

  // Obtener contador con ethers
  const fetchCertificateCount = async () => {
    if (!account || !window.ethereum) return;
    
    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_CONFIG.ADDRESS, CONTRACT_ABI, provider);
      
      const count = await contract.certificateCount();
      setCertificateCount(Number(count));
    } catch (error) {
      console.log('Error obteniendo contador:', error);
    }
  };

  // Validar fecha
  const validateAndFormatDate = (dateString) => {
    if (!dateString) return { valid: false, error: 'Fecha vacía' };
    
    const [year, month, day] = dateString.split('-');
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    
    if (isNaN(dateObj.getTime())) {
      return { valid: false, error: 'Fecha inválida' };
    }
    
    const timestamp = Math.floor(dateObj.getTime() / 1000);
    
    if (timestamp <= 0) {
      return { valid: false, error: 'Fecha debe ser después de 1970' };
    }
    
    if (timestamp > 4102444800) {
      return { valid: false, error: 'Fecha no puede ser después de 2100' };
    }
    
    return { 
      valid: true, 
      timestamp: timestamp.toString(),
      readable: dateObj.toLocaleDateString('es-ES', { timeZone: 'UTC' })
    };
  };

  // Crear certificado con ethers
  const createCertificate = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    setTransactionStatus(null);
    setErrorDetails('');

    try {
      if (!account) {
        throw new Error('Por favor conecta MetaMask primero');
      }

      if (!formData.fullName || !formData.courseTitle || !formData.date || !formData.grade || !formData.cid) {
        throw new Error('Por favor completa todos los campos');
      }

      const dateValidation = validateAndFormatDate(formData.date);
      if (!dateValidation.valid) {
        throw new Error(`Fecha inválida: ${dateValidation.error}`);
      }

      // Usar ethers.js
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_CONFIG.ADDRESS, CONTRACT_ABI, signer);

      const params = [
        formData.fullName.trim(),
        formData.courseTitle.trim(),
        dateValidation.timestamp,
        formData.grade.trim(),
        formData.cid.trim()
      ];

      // Enviar transacción
      const tx = await contract.createCertificate(...params);
      
      setTransactionStatus({
        success: true,
        message: '⏳ Transacción enviada, esperando confirmación...',
        transactionHash: tx.hash
      });

      // Esperar confirmación
      const receipt = await tx.wait();
      
      setTransactionStatus({
        success: true,
        message: '✅ ¡Certificado registrado exitosamente en Sonic!',
        transactionHash: receipt.hash,
        explorerUrl: `${CONTRACT_CONFIG.EXPLORER_URL}/tx/${receipt.hash}`,
        studentName: formData.fullName
      });

      // Actualizar contador y limpiar
      fetchCertificateCount();
      setFormData({ fullName: '', courseTitle: '', date: '', grade: '', cid: '' });

    } catch (error) {
      console.error('Error:', error);
      
      let errorMsg = 'Error al crear el certificado';
      
      if (error.message.includes('user rejected')) {
        errorMsg = '❌ Transacción rechazada por el usuario';
      } 
      else if (error.message.includes('insufficient funds')) {
        errorMsg = '❌ Fondos insuficientes para gas';
        setErrorDetails('💡 Obtén tokens S en: https://faucet.testnet.soniclabs.com');
      }
      else if (error.message.includes('revert')) {
        errorMsg = '❌ Transacción revertida (CID duplicado o datos inválidos)';
      }
      else {
        errorMsg = `❌ ${error.message}`;
      }

      setTransactionStatus({ success: false, message: errorMsg });
    }

    setLoading(false);
  };

  // Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateRandomCID = () => {
    const randomCID = 'test-cid-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    setFormData(prev => ({ ...prev, cid: randomCID }));
  };

  const testWithSampleData = () => {
    setFormData({
      fullName: 'María García López',
      courseTitle: 'Desarrollo Web3',
      date: '2024-01-15',
      grade: '95/100 (Excelente)',
      cid: 'test-cid-' + Date.now() + '-sonic'
    });
  };

  const getTestTokens = () => {
    window.open('https://faucet.testnet.soniclabs.com', '_blank');
  };

  const isFormValid = () => {
    return formData.fullName && 
           formData.courseTitle && 
           formData.date && 
           formData.grade && 
           formData.cid &&
           validateAndFormatDate(formData.date).valid;
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* HEADER */}
      <header style={{
        textAlign: 'center',
        marginBottom: '40px',
        padding: '30px',
        background: 'linear-gradient(135deg, #2c5530 0%, #1e3a23 100%)',
        color: 'white',
        borderRadius: '15px'
      }}>
        <h1 style={{ marginBottom: '10px', fontSize: '2.5rem' }}>🎓 Registro de Certificados en Sonic</h1>
        <p style={{ opacity: 0.9 }}>Usando MetaMask en Sonic Testnet</p>
        
        <div style={{ marginTop: '20px' }}>
          {!account ? (
            <button 
              onClick={connectWallet}
              style={{
                padding: '12px 24px',
                background: '#f6851b',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '1.1rem'
              }}
            >
              🦊 Conectar MetaMask
            </button>
          ) : (
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '15px',
              borderRadius: '10px'
            }}>
              <div style={{ fontWeight: 'bold' }}>
                👤 {account.slice(0, 6)}...{account.slice(-4)}
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                🌐 Sonic Testnet • Certificados: {certificateCount}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* FORMULARIO */}
      {account ? (
        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '15px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <form onSubmit={createCertificate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontWeight: 600, marginBottom: '8px', color: '#2c5530' }}>
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
                  padding: '12px 16px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontWeight: 600, marginBottom: '8px', color: '#2c5530' }}>
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
                  padding: '12px 16px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontWeight: 600, marginBottom: '8px', color: '#2c5530' }}>
                📅 Fecha *
              </label>
              <input
                type="date"
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
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontWeight: 600, marginBottom: '8px', color: '#2c5530' }}>
                ⭐ Nota *
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
                  padding: '12px 16px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontWeight: 600, marginBottom: '8px', color: '#2c5530' }}>
                🔗 CID *
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
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
                    fontSize: '16px',
                    flex: 1
                  }}
                />
                <button
                  type="button"
                  onClick={generateRandomCID}
                  disabled={loading}
                  style={{
                    padding: '12px 16px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  🎲 Generar
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
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
                  cursor: (loading || !isFormValid()) ? 'not-allowed' : 'pointer',
                  flex: 1,
                  opacity: (loading || !isFormValid()) ? 0.7 : 1
                }}
              >
                {loading ? '⏳ Registrando...' : '🚀 Registrar en Sonic'}
              </button>
              
              <button 
                type="button"
                onClick={testWithSampleData}
                disabled={loading}
                style={{
                  padding: '15px 20px',
                  background: '#0dcaf0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                🧪 Probar
              </button>
            </div>
          </form>

          {/* RESULTADOS */}
          {transactionStatus && (
            <div style={{
              marginTop: '30px',
              padding: '20px',
              borderRadius: '12px',
              borderLeft: '5px solid',
              background: transactionStatus.success ? '#e8f5e9' : '#ffebee',
              borderColor: transactionStatus.success ? '#2c5530' : '#d32f2f'
            }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>
                {transactionStatus.success ? '✅ Éxito' : '❌ Error'}
              </p>
              <p>{transactionStatus.message}</p>
              
              {transactionStatus.success && transactionStatus.explorerUrl && (
                <a 
                  href={transactionStatus.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    background: '#2c5530',
                    color: 'white',
                    textDecoration: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    marginTop: '10px'
                  }}
                >
                  🔍 Ver en Explorer
                </a>
              )}
              
              {errorDetails && (
                <div style={{ marginTop: '15px' }}>
                  <p>{errorDetails}</p>
                  <button 
                    onClick={getTestTokens}
                    style={{
                      padding: '8px 16px',
                      background: '#198754',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      marginTop: '10px'
                    }}
                  >
                    💰 Obtener Tokens
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '15px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h2>🦊 Conecta MetaMask</h2>
          <p>Para registrar certificados en Sonic Testnet</p>
          <button 
            onClick={connectWallet}
            style={{
              padding: '15px 30px',
              background: '#f6851b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              marginTop: '20px',
              cursor: 'pointer'
            }}
          >
            Conectar MetaMask
          </button>
          <p style={{ marginTop: '15px', fontSize: '0.9rem', opacity: 0.8 }}>
            Asegúrate de estar en <strong>Sonic Testnet (ChainID: 14601)</strong>
          </p>
        </div>
      )}

      {/* INFORMACIÓN */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '15px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
      }}>
        <p style={{ margin: 0, textAlign: 'center' }}>
          <strong>Contrato:</strong> {CONTRACT_CONFIG.ADDRESS.slice(0, 10)}...{CONTRACT_CONFIG.ADDRESS.slice(-8)} • 
          <strong> Red:</strong> Sonic Testnet • 
          <strong> Tokens:</strong> <button onClick={getTestTokens} style={{ background: 'none', border: 'none', color: '#0d6efd', cursor: 'pointer' }}>Obtener S</button>
        </p>
      </div>
    </div>
  );
}
