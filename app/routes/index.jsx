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
  const [account, setAccount] = useState('');

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

  // SOLUCIÓN: Ignorar conflictos y usar lo que funcione
  const getProvider = () => {
    try {
      // Intentar Rabby primero
      if (window.rabby) return window.rabby;
      // Intentar cualquier ethereum
      if (window.ethereum) return window.ethereum;
      return null;
    } catch {
      return null;
    }
  };

  const connectWallet = async () => {
    const provider = getProvider();
    
    if (!provider) {
      alert('Instala Rabby Wallet desde rabby.io');
      window.open('https://rabby.io', '_blank');
      return;
    }

    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
    } catch (error) {
      console.log('User rejected:', error);
    }
  };

  const createCertificate = async (e) => {
    e.preventDefault();
    
    if (!account) {
      alert('Conecta wallet primero');
      return;
    }

    setLoading(true);

    try {
      const provider = getProvider();
      const Web3 = (await import('web3')).default;
      const web3 = new Web3(provider);
      const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
      
      const dateTimestamp = Math.floor(new Date(formData.date).getTime() / 1000);
      
      const tx = await contract.methods.createCertificate(
        formData.fullName,
        formData.courseTitle,
        dateTimestamp,
        formData.grade,
        formData.cid
      ).send({ from: account, gas: 50000 });
      
      setTransactionStatus({
        success: true,
        hash: tx.transactionHash,
        message: '✅ Certificado creado!'
      });

      setFormData({ fullName: '', courseTitle: '', date: '', grade: '', cid: '' });

    } catch (error) {
      setTransactionStatus({
        success: false,
        message: 'Error: ' + (error.message || 'Desconocido')
      });
    }

    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>🎓 Registrar Certificado</h1>
      
      {!account ? (
        <button onClick={connectWallet} style={{ padding: '15px', background: '#8B5CF6', color: 'white', border: 'none', borderRadius: '8px' }}>
          Conectar Wallet
        </button>
      ) : (
        <div>
          <p>Conectado: {account.slice(0, 6)}...{account.slice(-4)}</p>
          
          <form onSubmit={createCertificate}>
            <input type="text" placeholder="Nombre" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} required style={{ width: '100%', margin: '10px 0', padding: '10px' }} />
            <input type="text" placeholder="Curso" value={formData.courseTitle} onChange={e => setFormData({...formData, courseTitle: e.target.value})} required style={{ width: '100%', margin: '10px 0', padding: '10px' }} />
            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required style={{ width: '100%', margin: '10px 0', padding: '10px' }} />
            <input type="text" placeholder="Nota" value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} required style={{ width: '100%', margin: '10px 0', padding: '10px' }} />
            <input type="text" placeholder="CID IPFS" value={formData.cid} onChange={e => setFormData({...formData, cid: e.target.value})} required style={{ width: '100%', margin: '10px 0', padding: '10px' }} />
            
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '15px', background: '#2c5530', color: 'white', border: 'none', borderRadius: '8px' }}>
              {loading ? 'Enviando...' : 'Registrar'}
            </button>
          </form>
          
          {transactionStatus && (
            <div style={{ marginTop: '20px', padding: '15px', background: transactionStatus.success ? '#d4edda' : '#f8d7da', borderRadius: '8px' }}>
              <p>{transactionStatus.message}</p>
              {transactionStatus.hash && (
                <a href={`https://testnet.soniclabs.com/tx/${transactionStatus.hash}`} target="_blank" rel="noopener noreferrer">
                  Ver transacción
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
