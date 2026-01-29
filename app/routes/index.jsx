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
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorDetails, setErrorDetails] = useState('');
  const [provider, setProvider] = useState(null);
  const [certificateCount, setCertificateCount] = useState(0);
  const [debugInfo, setDebugInfo] = useState('');

  // Detectar wallet disponible (evita conflictos)
  useEffect(() => {
    const detectWallet = () => {
      // Priorizar Rabby si existe
      if (window.rabby && window.rabby.ethereum) {
        console.log('✅ Detectado: Rabby Wallet');
        return window.rabby.ethereum;
      } 
      // Si no, usar ethereum global
      else if (window.ethereum) {
        console.log('⚠️ Detectado: Ethereum Provider (puede ser MetaMask)');
        return window.ethereum;
      }
      console.log('❌ No se detectó wallet');
      return null;
    };

    const wallet = detectWallet();
    if (wallet) {
      setProvider(wallet);
      
      // Verificar si ya hay cuenta conectada
      wallet.request({ method: 'eth_accounts' })
        .then(accounts => {
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            checkNetwork(wallet);
          }
        })
        .catch(console.error);
      
      // Escuchar cambios de cuenta
      wallet.on('accountsChanged', (accounts) => {
        console.log('📝 Cuenta cambiada:', accounts);
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount('');
        }
      });
      
      // Escuchar cambios de red
      wallet.on('chainChanged', () => {
        console.log('🌐 Red cambiada, recargando...');
        window.location.reload();
      });
    }
  }, []);

  // Verificar red correcta
  const checkNetwork = async (wallet) => {
    try {
      const chainId = await wallet.request({ method: 'eth_chainId' });
      console.log('Chain ID actual:', chainId);
      
      if (chainId !== SONIC_TESTNET.chainId) {
        console.log('⚠️ No estás en Sonic Testnet, cambiando...');
        await switchToSonicNetwork(wallet);
      }
    } catch (error) {
      console.error('Error verificando red:', error);
    }
  };

  // Cambiar a red Sonic
  const switchToSonicNetwork = async (wallet) => {
    try {
      await wallet.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SONIC_TESTNET.chainId }],
      });
      console.log('✅ Cambiado a Sonic Testnet');
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await wallet.request({
            method: 'wallet_addEthereumChain',
            params: [SONIC_TESTNET],
          });
          console.log('✅ Red Sonic agregada');
        } catch (addError) {
          console.error('Error agregando red:', addError);
        }
      } else {
        console.error('Error cambiando red:', switchError);
      }
    }
  };

  // Conectar wallet
  const connectWallet = async () => {
    if (!provider) {
      alert('Por favor instala Rabby Wallet desde rabby.io');
      window.open('https://rabby.io', '_blank');
      return;
    }

    setIsConnecting(true);
    setDebugInfo('Conectando wallet...');
    
    try {
      // Solicitar cuentas
      const accounts = await provider.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        setDebugInfo(`Wallet conectada: ${accounts[0].slice(0, 10)}...`);
        
        // Verificar y cambiar a Sonic si es necesario
        await checkNetwork(provider);
      }
    } catch (error) {
      console.error('Error conectando wallet:', error);
      setErrorDetails(`Error de conexión: ${error.message}`);
      setDebugInfo(`Error: ${error.message}`);
    }
    setIsConnecting(false);
  };

  // Obtener contador de certificados
  const fetchCertificateCount = async () => {
    if (!account || !provider) return;
    
    try {
      const Web3 = (await import('web3')).default;
      const web3 = new Web3(provider);
      const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_CONFIG.ADDRESS);
      
      const count = await contract.methods.certificateCount().call();
      setCertificateCount(parseInt(count));
      console.log('📊 Certificados registrados:', count);
    } catch (error) {
      console.log('Error obteniendo contador:', error);
    }
  };

  // Validar y formatear fecha
  const validateAndFormatDate = (dateString) => {
    if (!dateString) return { valid: false, error: 'Fecha vacía' };
    
    // Crear fecha en UTC
    const dateObj = new Date(dateString + 'T00:00:00Z');
    
    if (isNaN(dateObj.getTime())) {
      return { valid: false, error: 'Fecha inválida' };
    }
    
    const timestamp = Math.floor(dateObj.getTime() / 1000);
    
    // Validaciones
    if (timestamp <= 0) {
      return { valid: false, error: 'Fecha debe ser después de 1970' };
    }
    
    if (timestamp > 4102444800) { // 2100-01-01
      return { valid: false, error: 'Fecha no puede ser después de 2100' };
    }
    
    return { 
      valid: true, 
      timestamp: timestamp.toString(),
      readable: dateObj.toLocaleDateString('es-ES')
    };
  };

  // Crear certificado - VERSIÓN CORREGIDA
  const createCertificate = async (e) => {
    e.preventDefault();
    
    // Resetear estados
    setLoading(true);
    setTransactionStatus(null);
    setErrorDetails('');
    setDebugInfo('Iniciando registro...');

    try {
      // ===== VALIDACIONES =====
      if (!account) {
        throw new Error('Por favor conecta tu wallet primero');
      }

      if (!formData.fullName || !formData.courseTitle || !formData.date || !formData.grade || !formData.cid) {
        throw new Error('Por favor completa todos los campos');
      }

      // Validar fecha
      const dateValidation = validateAndFormatDate(formData.date);
      if (!dateValidation.valid) {
        throw new Error(`Fecha inválida: ${dateValidation.error}`);
      }

      // Validar CID (formato básico)
      if (formData.cid.trim().length < 10) {
        throw new Error('CID debe tener al menos 10 caracteres');
      }

      setDebugInfo('Validaciones pasadas ✓');

      // ===== PREPARAR DATOS =====
      const Web3 = await import('web3');
      const web3 = new Web3.default(provider);
      const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_CONFIG.ADDRESS);

      const params = [
        formData.fullName.trim(),
        formData.courseTitle.trim(),
        dateValidation.timestamp, // Timestamp como string
        formData.grade.trim(),
        formData.cid.trim()
      ];

      console.log('📤 Enviando parámetros:', params);
      setDebugInfo(`Parámetros preparados: ${JSON.stringify(params, null, 2)}`);

      // ===== SIMULAR TRANSACCIÓN =====
      setDebugInfo('Simulando transacción...');
      try {
        await contract.methods.createCertificate(...params)
          .call({ from: account });
        console.log('✅ Simulación exitosa');
        setDebugInfo('Simulación exitosa ✓');
      } catch (simulationError) {
        console.error('❌ Error en simulación:', simulationError);
        throw new Error(`Error en simulación: ${simulationError.message}`);
      }

      // ===== ESTIMAR GAS =====
      setDebugInfo('Estimando gas...');
      const gasEstimate = await contract.methods.createCertificate(...params)
        .estimateGas({ from: account });
      console.log('Gas estimado:', gasEstimate);
      setDebugInfo(`Gas estimado: ${gasEstimate}`);

      // ===== OBTENER GAS PRICE =====
      const gasPrice = await web3.eth.getGasPrice();
      console.log('Gas price:', gasPrice);
      
      // ===== ENVIAR TRANSACCIÓN =====
      setDebugInfo('Enviando transacción...');
      const txResult = await contract.methods.createCertificate(...params)
        .send({
          from: account,
          gas: Math.round(gasEstimate * 1.5).toString(), // 50% más por seguridad
          gasPrice: gasPrice,
          type: '0x0' // Tipo de transacción explícito
        });

      console.log('✅ Transacción exitosa:', txResult);
      setDebugInfo('Transacción minada ✓');

      // ===== ÉXITO =====
      setTransactionStatus({
        success: true,
        message: '✅ ¡Certificado registrado exitosamente en Sonic Blockchain!',
        transactionHash: txResult.transactionHash,
        explorerUrl: `${CONTRACT_CONFIG.EXPLORER_URL}/tx/${txResult.transactionHash}`,
        studentName: formData.fullName,
        courseName: formData.courseTitle,
        date: dateValidation.readable
      });

      // Actualizar contador
      fetchCertificateCount();

      // Limpiar formulario
      setFormData({
        fullName: '',
        courseTitle: '',
        date: '',
        grade: '',
        cid: ''
      });

    } catch (error) {
      console.error('❌ Error completo:', error);
      setDebugInfo(`Error: ${error.message}`);
      
      // ===== ANÁLISIS DETALLADO DEL ERROR =====
      let errorMsg = 'Error al crear el certificado';
      let suggestion = '';

      // Buscar errores específicos
      if (error.message.includes('User denied')) {
        errorMsg = '❌ Transacción cancelada por el usuario';
      } 
      else if (error.message.includes('insufficient funds') || error.message.includes('gas')) {
        errorMsg = '❌ Fondos insuficientes para gas';
        suggestion = `Necesitas tokens S (Sonic) para pagar el gas.
        
💡 Obtén tokens de prueba en:
https://faucet.testnet.soniclabs.com

💰 Saldo mínimo recomendado: 0.2 S`;
      }
      else if (error.message.includes('revert') || error.message.includes('reverted')) {
        errorMsg = '❌ Transacción revertida por el contrato';
        suggestion = `El contrato rechazó la transacción.

🔍 Posibles causas:
1. CID duplicado (ya existe)
2. Fecha inválida en el contrato
3. Límite de caracteres excedido
4. Restricción del contrato

🛠️ Soluciones:
• Usa un CID diferente: test-${Date.now()}
• Verifica que el contrato esté correcto
• Contacta al administrador del contrato`;
        
        // Mostrar más detalles si están disponibles
        if (error.data) {
          console.log('Datos del revert:', error.data);
          suggestion += `\n\n📄 Datos técnicos: ${error.data}`;
        }
      }
      else if (error.message.includes('nonce')) {
        errorMsg = '❌ Error de nonce';
        suggestion = 'Recarga la página y prueba de nuevo';
      }
      else if (error.message.includes('underpriced')) {
        errorMsg = '❌ Gas price muy bajo';
        suggestion = 'La transacción necesita más gas price';
      }
      else {
        errorMsg = `❌ ${error.message}`;
      }

      setErrorDetails(suggestion);
      setTransactionStatus({
        success: false,
        message: errorMsg
      });
    }

    setLoading(false);
  };

  // Handler para inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Generar CID aleatorio para pruebas
  const generateRandomCID = () => {
    const randomCID = 'test-cid-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    setFormData(prev => ({ ...prev, cid: randomCID }));
    setDebugInfo(`CID generado: ${randomCID}`);
  };

  // Probar con datos de prueba
  const testWithSampleData = () => {
    const sampleData = {
      fullName: 'María García López',
      courseTitle: 'Desarrollo Web3 Avanzado',
      date: '2024-01-15',
      grade: '95/100 (Excelente)',
      cid: 'test-' + Date.now() + '-sonic'
    };
    
    setFormData(sampleData);
    setDebugInfo('Datos de prueba cargados ✓');
  };

  // Formatear fecha para display
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00Z');
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-ES');
  };

  // Copiar al portapapeles
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('¡Copiado al portapapeles!');
    });
  };

  // Verificar si el formulario es válido
  const isFormValid = () => {
    return formData.fullName && 
           formData.courseTitle && 
           formData.date && 
           formData.grade && 
           formData.cid &&
           validateAndFormatDate(formData.date).valid;
  };

  // Verificar contrato en explorer
  const verifyContract = () => {
    window.open(`${CONTRACT_CONFIG.EXPLORER_URL}/address/${CONTRACT_CONFIG.ADDRESS}`, '_blank');
  };

  // Obtener faucet
  const getTestTokens = () => {
    window.open('https://faucet.testnet.soniclabs.com', '_blank');
  };

  useEffect(() => {
    if (account) {
      fetchCertificateCount();
    }
  }, [account]);

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      minHeight: '100vh'
    }}>
      {/* HEADER */}
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
              disabled={isConnecting || !provider}
              style={{
                padding: '12px 24px',
                background: provider ? '#f6851b' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: provider ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '1.1rem'
              }}
            >
              {!provider ? 'Instalar Wallet' : 
               isConnecting ? 'Conectando...' : '🔗 Conectar Wallet'}
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
              <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>🌐 Sonic Testnet ✅</p>
            </div>
          )}
        </div>
      </header>

      {/* PANEL DE DIAGNÓSTICO */}
      <div style={{
        background: '#e8f4fd',
        padding: '15px',
        borderRadius: '10px',
        marginBottom: '20px',
        border: '1px solid #b6d4fe'
      }}>
        <h4 style={{ marginTop: 0, color: '#084298', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🔧 Panel de Diagnóstico
        </h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
          marginTop: '10px'
        }}>
          <div style={{ padding: '8px', background: 'white', borderRadius: '6px' }}>
            <strong>Wallet:</strong> {provider ? '✅ Detectado' : '❌ No detectado'}
          </div>
          <div style={{ padding: '8px', background: 'white', borderRadius: '6px' }}>
            <strong>Conexión:</strong> {account ? `✅ ${account.slice(0, 10)}...` : '❌ Desconectado'}
          </div>
          <div style={{ padding: '8px', background: 'white', borderRadius: '6px' }}>
            <strong>Certificados:</strong> {certificateCount} registrados
          </div>
          <div style={{ padding: '8px', background: 'white', borderRadius: '6px' }}>
            <strong>Contrato:</strong> 
            <button 
              onClick={verifyContract}
              style={{
                marginLeft: '8px',
                padding: '4px 8px',
                background: '#0d6efd',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Verificar
            </button>
          </div>
        </div>
        
        {debugInfo && (
          <div style={{
            marginTop: '10px',
            padding: '10px',
            background: '#fff3cd',
            borderRadius: '6px',
            border: '1px solid #ffc107',
            fontSize: '0.9rem'
          }}>
            <strong>📝 Log:</strong> {debugInfo}
          </div>
        )}
      </div>

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
            
            {/* Nombre */}
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

            {/* Curso */}
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

            {/* Fecha */}
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
                min="2020-01-01"
                max="2099-12-31"
                style={{
                  padding: '12px 16px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
              {formData.date && (
                <small style={{ marginTop: '5px', color: '#2c5530', fontSize: '0.9rem', fontWeight: 500 }}>
                  📅 Se registrará como: {formatDateForDisplay(formData.date)} (Timestamp: {validateAndFormatDate(formData.date).timestamp || 'inválido'})
                </small>
              )}
            </div>

            {/* Nota */}
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

            {/* CID */}
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
              <div style={{ display: 'flex', gap: '10px' }}>
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
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  🎲 Generar CID
                </button>
              </div>
              <small style={{ marginTop: '5px', color: '#6c757d', fontSize: '0.85rem' }}>
                Sube tu documento a IPFS o Arweave y pega el CID aquí
              </small>
            </div>

            {/* BOTONES DE ACCIÓN */}
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  flex: 1,
                  opacity: (loading || !isFormValid()) ? 0.7 : 1
                }}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span> Registrando en Sonic...
                  </>
                ) : (
                  '🚀 Registrar en Blockchain'
                )}
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
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  whiteSpace: 'nowrap'
                }}
              >
                🧪 Probar Datos
              </button>
            </div>
          </form>

          {/* PANEL DE RESULTADOS */}
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
                      <div style={{
                        background: 'white',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #e9ecef'
                      }}>
                        <strong>📅 Fecha:</strong>
                        <div>{transactionStatus.date}</div>
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
                      whiteSpace: 'pre-line',
                      fontFamily: 'monospace',
                      fontSize: '0.9rem'
                    }}>
                      <strong>💡 Sugerencias y Soluciones:</strong>
                      <div style={{ marginTop: '10px' }}>{errorDetails}</div>
                      
                      <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #ffc107' }}>
                        <strong>🛠️ Acciones recomendadas:</strong>
                        <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                          <button 
                            onClick={getTestTokens}
                            style={{
                              padding: '8px 16px',
                              background: '#198754',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            💰 Obtener Tokens
                          </button>
                          <button 
                            onClick={verifyContract}
                            style={{
                              padding: '8px 16px',
                              background: '#0d6efd',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            📄 Ver Contrato
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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
          <div style={{ textAlign: 'center' }}>
            <h2>🔗 Conecta tu Wallet</h2>
            <p>Para registrar certificados en Sonic, necesitas conectar tu wallet</p>
            <button 
              onClick={connectWallet}
              disabled={!provider}
              style={{
                padding: '15px 30px',
                background: provider ? '#f6851b' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.1rem',
                marginTop: '20px',
                cursor: provider ? 'pointer' : 'not-allowed'
              }}
            >
              {provider ? '🔗 Conectar Wallet' : 'Instalar Wallet Primero'}
            </button>
            <p style={{ marginTop: '15px', fontSize: '0.9rem', opacity: 0.8 }}>
              Recomendado: <strong>Rabby Wallet</strong> para mejor compatibilidad con Sonic
            </p>
          </div>
        </div>
      )}

      {/* INFORMACIÓN TÉCNICA */}
      <div style={{
        background: 'white',
        padding: '25px',
        borderRadius: '15px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        marginTop: '30px'
      }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>🔧 Información Técnica</h3>
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
            <strong>ChainID:</strong> 14601 (0x3909)
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
              marginLeft: '5px',
              fontFamily: 'monospace'
            }}>
              {CONTRACT_CONFIG.ADDRESS.slice(0, 10)}...{CONTRACT_CONFIG.ADDRESS.slice(-8)}
            </code>
          </div>
        </div>
      </div>

      {/* ESTILOS ADICIONALES */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid #ffffff;
          border-radius: 50%;
          border-top-color: transparent;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        input:disabled {
          background-color: #f8f9fa;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
