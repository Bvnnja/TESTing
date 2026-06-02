document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById('footer-container');
    if (!container) return;

    // Determinar la ruta base basado en si estamos en la raíz o en pages/
    const isPage = window.location.pathname.includes('/pages/');
    const basePath = isPage ? '../' : './';

    fetch(basePath + 'components/footer.html')
        .then(response => {
            if (!response.ok) throw new Error("No se pudo cargar el footer");
            return response.text();
        })
        .then(html => {
            container.innerHTML = html;
            
            // Actualizar el año automáticamente
            const yearSpan = document.getElementById('year');
            if (yearSpan) {
                yearSpan.textContent = new Date().getFullYear();
            }

            // Actualizar los enlaces para que funcionen desde cualquier ruta
            const links = container.querySelectorAll('a');
            links.forEach(link => {
                const text = link.textContent.toLowerCase();
                if (text.includes('inicio') || text.includes('catálogo') || text.includes('ofertas')) {
                    link.href = basePath + 'index.html';
                }
            });
        })
        .catch(err => console.error('Error cargando el footer:', err));
});
