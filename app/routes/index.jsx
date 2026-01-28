import { useState } from 'react';

export default function CreateCertificate() {
  const [account, setAccount] = useState('');
  const [status, setStatus] = useState('');
  
  // Función SEGURA sin errores
  const connectWallet = async () => {
    try {
      setStatus('Conectando...');
      
      // Detectar provider de forma segura
      let provider;
      if (typeof window !== 'undefined') {
        if (window.rabby) {
          provider = window.rabby;
        } else if (window.ethereum) {
          provider = window.ethereum;
        }
      }
      
      if (!provider) {
        setStatus('No se detectó wallet');
        alert('Por favor instala Rabby Wallet');
        return;
      }
      
      const accounts = await provider.request({ 
        method: 'eth_requestAccounts' 
      });
      
      setAccount(accounts[0]);
      setStatus('Conectado exitosamente');
      
    } catch (error) {
      console.log('Error de conexión:', error);
      setStatus('Error: ' + (error.message || 'Desconocido'));
    }
  };
  
  // Interfaz SIMPLE que no falla
  return (
    <div style={{
      maxWidth: '600px',
      margin: '40px auto',
      padding: '30px',
      fontFamily: 'system-ui, sans-serif',
      textAlign: 'center'
    }}>
      <h1 style={{ color: '#2c5530', marginBottom: '20px' }}>
        🎓 Registro de Certificados Sonic
      </h1>
      
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Crea certificados inmutables en Sonic Testnet
      </p>
      
      {!account ? (
        <div>
          <button
            onClick={connectWallet}
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              background: '#8B5CF6',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🦝 Conectar Rabby Wallet
          </button>
          
          {status && (
            <p style={{ marginTop: '15px', color: '#666' }}>
              {status}
            </p>
          )}
          
          <div style={{
            marginTop: '30px',
            padding: '20px',
            background: '#f8f9fa',
            borderRadius: '10px',
            textAlign: 'left'
          }}>
            <h3>📋 Requisitos:</h3>
            <ul>
              <li>Rabby Wallet instalado</li>
              <li>Cuenta en Sonic Testnet</li>
              <li>Fondos S para gas</li>
            </ul>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'left' }}>
          <div style={{
            background: '#e8f5e9',
            padding: '15px',
            borderRadius: '10px',
            marginBottom: '20px'
          }}>
            <p><strong>✅ Wallet Conectada:</strong></p>
            <p>{account.slice(0, 10)}...{account.slice(-8)}</p>
            <p style={{ fontSize: '14px', color: '#2c5530' }}>
              🌐 Sonic Testnet | 🦝 Rabby Wallet
            </p>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <p style={{ color: '#666' }}>
              ⚠️ El formulario completo se cargará en la próxima versión
            </p>
            <button
              onClick={() => setAccount('')}
              style={{
                padding: '10px 20px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                marginTop: '20px'
              }}
            >
              Desconectar Wallet
            </button>
          </div>
        </div>
      )}
      
      <footer style={{
        marginTop: '50px',
        paddingTop: '20px',
        borderTop: '1px solid #eee',
        color: '#999',
        fontSize: '14px'
      }}>
        <p>🔗 Contrato: 0xAe48Ed8cD53e6e595E857872b1ac338E17F08549</p>
        <p>🌐 Sonic Testnet (ChainID: 14601)</p>
      </footer>
    </div>
  );
}
