// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CertificateRegistry
 * @dev Contrato para registrar certificados en Sonic Blockchain
 */
contract CertificateRegistry {
    
    // Estructura del certificado con los campos específicos requeridos
    struct Certificate {
        uint256 id;
        string fullName;      // Nombre completo
        string courseTitle;   // Curso o Título
        uint256 date;         // Fecha (timestamp)
        string grade;         // Nota
        string cid;           // CID del título (IPFS/Arweave)
        address issuer;       // Dirección que emitió el certificado
        uint256 createdAt;    // Fecha de creación en blockchain
    }
    
    // Propietario del contrato
    address public owner;
    
    // Contador de certificados
    uint256 public certificateCount;
    
    // Mapeo de ID a certificado
    mapping(uint256 => Certificate) public certificates;
    
    // Mapeo de CID a ID (para búsqueda rápida)
    mapping(string => uint256) public cidToId;
    
    // Mapeo de dirección a lista de IDs emitidos
    mapping(address => uint256[]) public issuerCertificates;
    
    // Eventos
    event CertificateCreated(
        uint256 indexed id,
        address indexed issuer,
        string fullName,
        string courseTitle,
        uint256 date,
        string grade,
        string cid
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // Modificadores
    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el propietario puede realizar esta accion");
        _;
    }
    
    // Constructor
    constructor() {
        owner = msg.sender;
        certificateCount = 0;
    }
    
    /**
     * @dev Crear un nuevo certificado
     */
    function createCertificate(
        string memory _fullName,
        string memory _courseTitle,
        uint256 _date,
        string memory _grade,
        string memory _cid
    ) external returns (uint256) {
        // Validaciones
        require(bytes(_fullName).length > 0, "El nombre completo es requerido");
        require(bytes(_courseTitle).length > 0, "El curso o titulo es requerido");
        require(_date > 0, "La fecha es requerida");
        require(bytes(_grade).length > 0, "La nota es requerida");
        require(bytes(_cid).length > 0, "El CID es requerido");
        require(cidToId[_cid] == 0, "Este CID ya esta registrado");
        
        // Incrementar contador
        certificateCount++;
        
        // Crear certificado
        Certificate memory newCertificate = Certificate({
            id: certificateCount,
            fullName: _fullName,
            courseTitle: _courseTitle,
            date: _date,
            grade: _grade,
            cid: _cid,
            issuer: msg.sender,
            createdAt: block.timestamp
        });
        
        // Almacenar certificado
        certificates[certificateCount] = newCertificate;
        cidToId[_cid] = certificateCount;
        issuerCertificates[msg.sender].push(certificateCount);
        
        // Emitir evento
        emit CertificateCreated(
            certificateCount,
            msg.sender,
            _fullName,
            _courseTitle,
            _date,
            _grade,
            _cid
        );
        
        return certificateCount;
    }
    
    /**
     * @dev Obtener un certificado por ID
     */
    function getCertificate(uint256 _id) external view returns (
        uint256 id,
        string memory fullName,
        string memory courseTitle,
        uint256 date,
        string memory grade,
        string memory cid,
        address issuer,
        uint256 createdAt
    ) {
        require(_id > 0 && _id <= certificateCount, "Certificado no existe");
        
        Certificate memory cert = certificates[_id];
        return (
            cert.id,
            cert.fullName,
            cert.courseTitle,
            cert.date,
            cert.grade,
            cert.cid,
            cert.issuer,
            cert.createdAt
        );
    }
    
    /**
     * @dev Obtener certificado por CID
     */
    function getCertificateByCID(string memory _cid) external view returns (
        uint256 id,
        string memory fullName,
        string memory courseTitle,
        uint256 date,
        string memory grade,
        address issuer,
        uint256 createdAt
    ) {
        uint256 id = cidToId[_cid];
        require(id > 0, "Certificado no encontrado");
        
        Certificate memory cert = certificates[id];
        return (
            cert.id,
            cert.fullName,
            cert.courseTitle,
            cert.date,
            cert.grade,
            cert.issuer,
            cert.createdAt
        );
    }
    
    /**
     * @dev Verificar si un CID existe
     */
    function verifyCertificate(string memory _cid) external view returns (bool) {
        return cidToId[_cid] > 0;
    }
    
    /**
     * @dev Obtener todos los certificados emitidos por una dirección
     */
    function getCertificatesByIssuer(address _issuer) external view returns (uint256[] memory) {
        return issuerCertificates[_issuer];
    }
    
    /**
     * @dev Obtener el total de certificados emitidos por una dirección
     */
    function getIssuerCertificateCount(address _issuer) external view returns (uint256) {
        return issuerCertificates[_issuer].length;
    }
    
    /**
     * @dev Transferir propiedad del contrato
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo propietario invalido");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }
    
    /**
     * @dev Obtener detalles del contrato
     */
    function getContractInfo() external view returns (
        address contractOwner,
        uint256 totalCertificates,
        uint256 deploymentDate
    ) {
        return (owner, certificateCount, block.timestamp);
    }
}
