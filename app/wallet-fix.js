// SOLUCIÓN DEFINITIVA PARA CONFLICTO METAMASK/RABBY
if (typeof window !== 'undefined') {
  // 1. PREVENIR que MetaMask se inyecte ANTES de cargar la app
  Object.defineProperty(window, 'ethereum', {
    configurable: false,
    enumerable: true,
    get() {
      // Solo permitir Rabby
      return window.rabby || null;
    },
    set(value) {
      // Bloquear inyección de MetaMask
      if (value && !value.isRabby) {
        console.warn('MetaMask bloqueado. Usa Rabby Wallet.');
        return;
      }
      // Permitir solo Rabby
      if (value && value.isRabby) {
        window.rabby = value;
      }
    }
  });

  // 2. Forzar detección limpia
  setTimeout(() => {
    if (window.rabby && !window.rabby.isRabby) {
      window.rabby.isRabby = true; // Forzar identificación
    }
  }, 1000);
}
