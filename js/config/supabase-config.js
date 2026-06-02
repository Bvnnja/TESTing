// ============================================================
// CONFIGURACIÓN CENTRAL DE SUPABASE
// ============================================================
const SUPABASE_URL = 'https://fhvinwdaaybnwxpsivsi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZodmlud2RhYXlibnd4cHNpdnNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNjg2OTMsImV4cCI6MjA4ODk0NDY5M30.S0wYDW7utGuqRRCMu-k9w8FQ9mAWkk-92aX_GzZJ08E';

// Inicializar el cliente global de Supabase
// Asegúrate de que el CDN de Supabase se haya cargado antes de este archivo
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Funciones de UI globales
window.mostrarToast = function(mensaje, tipo = 'info') {
    let container = document.getElementById('toast-container');
    
    // Si no existe el contenedor, crearlo e inyectarlo en el body
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
  
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    let icono = 'fa-info-circle';
    if (tipo === 'exito') icono = 'fa-check-circle';
    if (tipo === 'error') icono = 'fa-exclamation-circle';
    if (tipo === 'cargando') icono = 'fa-spinner fa-spin';
  
    toast.innerHTML = `<i class="fa ${icono}"></i> <span>${mensaje}</span>`;
    container.appendChild(toast);
  
    // Animar entrada
    setTimeout(() => {
      toast.classList.add('mostrar');
    }, 10);
  
    const quitarToast = () => {
        toast.classList.remove('mostrar');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    };

    if (tipo !== 'cargando') {
      setTimeout(quitarToast, 3000);
    }
  
    return { remove: quitarToast };
};

// Modal de Confirmación Global
window.mostrarConfirmacion = function(mensaje, callbackAceptar) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.6)';
    overlay.style.zIndex = '10000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';

    const modal = document.createElement('div');
    modal.style.backgroundColor = '#fff';
    modal.style.border = '2px solid #000';
    modal.style.borderRadius = '16px';
    modal.style.padding = '30px';
    modal.style.maxWidth = '400px';
    modal.style.width = '90%';
    modal.style.boxShadow = '8px 8px 0px #000';
    modal.style.textAlign = 'center';

    const texto = document.createElement('p');
    texto.innerText = mensaje;
    texto.style.fontSize = '1.1rem';
    texto.style.fontWeight = 'bold';
    texto.style.marginBottom = '25px';

    const contenedorBotones = document.createElement('div');
    contenedorBotones.style.display = 'flex';
    contenedorBotones.style.gap = '15px';
    contenedorBotones.style.justifyContent = 'center';

    const btnCancelar = document.createElement('button');
    btnCancelar.innerText = 'Cancelar';
    btnCancelar.style.padding = '10px 20px';
    btnCancelar.style.border = '2px solid #000';
    btnCancelar.style.borderRadius = '8px';
    btnCancelar.style.backgroundColor = '#fff';
    btnCancelar.style.fontWeight = 'bold';
    btnCancelar.style.cursor = 'pointer';
    btnCancelar.style.boxShadow = '3px 3px 0px #000';
    btnCancelar.style.transition = 'all 0.2s';

    const btnAceptar = document.createElement('button');
    btnAceptar.innerText = 'Aceptar';
    btnAceptar.style.padding = '10px 20px';
    btnAceptar.style.border = '2px solid #000';
    btnAceptar.style.borderRadius = '8px';
    btnAceptar.style.backgroundColor = '#ff4d4d';
    btnAceptar.style.color = '#fff';
    btnAceptar.style.fontWeight = 'bold';
    btnAceptar.style.cursor = 'pointer';
    btnAceptar.style.boxShadow = '3px 3px 0px #000';
    btnAceptar.style.transition = 'all 0.2s';

    btnCancelar.onmouseover = () => { btnCancelar.style.backgroundColor = '#f0f0f0'; btnCancelar.style.transform = 'translate(-2px, -2px)'; btnCancelar.style.boxShadow = '5px 5px 0px #000'; };
    btnCancelar.onmouseout = () => { btnCancelar.style.backgroundColor = '#fff'; btnCancelar.style.transform = 'translate(0, 0)'; btnCancelar.style.boxShadow = '3px 3px 0px #000'; };
    
    btnAceptar.onmouseover = () => { btnAceptar.style.transform = 'translate(-2px, -2px)'; btnAceptar.style.boxShadow = '5px 5px 0px #000'; };
    btnAceptar.onmouseout = () => { btnAceptar.style.transform = 'translate(0, 0)'; btnAceptar.style.boxShadow = '3px 3px 0px #000'; };

    const cerrarModal = () => {
        document.body.removeChild(overlay);
    };

    btnCancelar.onclick = cerrarModal;
    btnAceptar.onclick = () => {
        cerrarModal();
        if (callbackAceptar) callbackAceptar();
    };

    contenedorBotones.appendChild(btnCancelar);
    contenedorBotones.appendChild(btnAceptar);

    modal.appendChild(texto);
    modal.appendChild(contenedorBotones);
    overlay.appendChild(modal);

    document.body.appendChild(overlay);
};
