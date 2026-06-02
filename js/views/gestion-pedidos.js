document.addEventListener("DOMContentLoaded", async () => {
    // Referencias
    const tbodyPedidos = document.getElementById('tbody-pedidos');
    const buscador = document.getElementById('buscador-pedidos');
    const filtroEstado = document.getElementById('filtro-estado');
    const loaderPantalla = document.getElementById('loader-pantalla');
    const contenidoDashboard = document.getElementById('contenido-gestion-dashboard');

    const modalDetalle = document.getElementById('modal-detalle-compra');
    const btnCerrarDetalle = document.getElementById('btn-cerrar-detalle');

    let pedidosList = [];

    // Utilidad: Validar Admin
    function esUsuarioAdmin(user) {
        if (!user) return false;
        return user.email === 'admin@ferromarket.cl' || user.user_metadata?.role === 'admin';
    }

    async function verificarAcceso() {
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session || !esUsuarioAdmin(session.user)) {
                window.mostrarToast('Acceso denegado. Se requieren credenciales de administrador.', 'error');
                setTimeout(() => { window.location.href = '../index.html'; }, 1500);
                return;
            }
            
            // Acceso permitido
            loaderPantalla.style.display = 'none';
            contenidoDashboard.style.display = 'block';
            await cargarPedidos();
        } catch (e) {
            console.error('Error de acceso:', e);
            window.location.href = '../index.html';
        }
    }

    // Inicializar
    verificarAcceso();

    // Eventos del buscador y filtro
    buscador.addEventListener('input', renderizarPedidos);
    filtroEstado.addEventListener('change', renderizarPedidos);

    // Evento Modal
    btnCerrarDetalle.addEventListener('click', () => {
        modalDetalle.style.display = 'none';
    });

    async function cargarPedidos() {
        const { data, error } = await supabaseClient
            .from('pedidos')
            .select('*')
            .order('fecha', { ascending: false });

        if (error) {
            console.error(error);
            tbodyPedidos.innerHTML = `<tr><td colspan="7" style="color:red;text-align:center;">Error al cargar pedidos: ${error.message}</td></tr>`;
            return;
        }

        pedidosList = data || [];
        renderizarPedidos();
    }

    function renderizarPedidos() {
        const query = buscador.value.toLowerCase().trim().replace('#', '');
        const estadoFiltro = filtroEstado.value;

        const filtrados = pedidosList.filter(p => {
            const matchQuery = (p.codigo_orden && p.codigo_orden.toLowerCase().includes(query)) || 
                               (p.usuario_email && p.usuario_email.toLowerCase().includes(query)) ||
                               (p.usuario_nombre && p.usuario_nombre.toLowerCase().includes(query));
            
            const matchEstado = estadoFiltro === 'todos' || p.estado === estadoFiltro;

            return matchQuery && matchEstado;
        });

        tbodyPedidos.innerHTML = '';

        if (filtrados.length === 0) {
            tbodyPedidos.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px;">No se encontraron pedidos.</td></tr>`;
            return;
        }

        filtrados.forEach(pedido => {
            const tr = document.createElement('tr');
            
            const fechaFormat = new Date(pedido.fecha).toLocaleDateString('es-CL', {
                year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
            });

            const totalFormat = `$${pedido.total.toLocaleString('es-CL')}`;

            let claseBadge = 'badge-estado estado-pendiente';
            if (pedido.estado === 'Completado') claseBadge = 'badge-estado estado-completado';
            if (pedido.estado === 'Cancelado') claseBadge = 'badge-estado estado-cancelado';

            tr.innerHTML = `
                <td data-label="Código Orden" style="font-family:'Outfit'; font-weight:800;">${pedido.codigo_orden}</td>
                <td data-label="Cliente">
                    <div style="font-weight:700;">${pedido.usuario_nombre}</div>
                    <div style="font-size:0.85rem; color:#666;">${pedido.usuario_email}</div>
                </td>
                <td data-label="Fecha">${fechaFormat}</td>
                <td data-label="Total" style="font-weight:800;">${totalFormat}</td>
                <td data-label="Método Pago">${pedido.metodo_pago || 'N/A'}</td>
                <td data-label="Estado">
                    <span class="${claseBadge}" style="display:inline-block; margin-bottom: 5px;">${pedido.estado}</span>
                </td>
                <td data-label="Acciones" class="td-acciones">
                    <select class="select-estado" id="select-estado-${pedido.id}">
                        <option value="Pendiente" ${pedido.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                        <option value="Completado" ${pedido.estado === 'Completado' ? 'selected' : ''}>Completado</option>
                        <option value="Cancelado" ${pedido.estado === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                    </select>
                    <button class="btn-guardar-estado" onclick="cambiarEstadoPedido('${pedido.id}')" title="Guardar Estado">
                        <i class="fa fa-save"></i>
                    </button>
                    <button class="btn-accion-texto" onclick="verDetallePedido('${pedido.id}')" title="Ver Detalles completos">
                        <i class="fa fa-eye"></i> Detalles
                    </button>
                </td>
            `;

            tbodyPedidos.appendChild(tr);
        });
    }

    window.cambiarEstadoPedido = async function(id) {
        const select = document.getElementById(`select-estado-${id}`);
        const nuevoEstado = select.value;

        window.mostrarConfirmacion(
            `¿Estás seguro que deseas cambiar el estado a "${nuevoEstado}"?`, 
            async () => {
                const tr = select.closest('tr');
                tr.style.opacity = '0.5';

                const { error } = await supabaseClient
                    .from('pedidos')
                    .update({ estado: nuevoEstado })
                    .eq('id', id);

                tr.style.opacity = '1';

                if (error) {
                    window.mostrarToast('Error al actualizar: ' + error.message, 'error');
                } else {
                    window.mostrarToast('Estado del pedido actualizado correctamente.', 'exito');
                    const idx = pedidosList.findIndex(p => p.id == id);
                    if (idx !== -1) pedidosList[idx].estado = nuevoEstado;
                    renderizarPedidos();
                }
            }
        );
    };

    window.verDetallePedido = async function(id) {
        const pedido = pedidosList.find(p => p.id == id);
        if (!pedido) return;

        // Llenar info básica
        document.getElementById('detalle-codigo-orden').textContent = pedido.codigo_orden;
        document.getElementById('detalle-cliente').textContent = `${pedido.usuario_nombre} (${pedido.usuario_email})`;
        
        const fechaFormat = new Date(pedido.fecha).toLocaleDateString('es-CL', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        document.getElementById('detalle-fecha').textContent = fechaFormat;
        document.getElementById('detalle-pago').textContent = pedido.metodo_pago || 'No especificado';
        document.getElementById('detalle-total-monto').textContent = `$${pedido.total.toLocaleString('es-CL')}`;

        const estadoSpan = document.getElementById('detalle-estado');
        estadoSpan.textContent = pedido.estado;
        estadoSpan.className = 'badge-estado';
        if (pedido.estado === 'Completado') estadoSpan.classList.add('estado-completado');
        else if (pedido.estado === 'Cancelado') estadoSpan.classList.add('estado-cancelado');
        else estadoSpan.classList.add('estado-pendiente');

        // Mostrar cargando en productos
        const listaProd = document.getElementById('detalle-productos-lista');
        listaProd.innerHTML = '<p style="text-align:center;"><i class="fa fa-spinner fa-spin"></i> Cargando productos...</p>';
        
        // Mostrar modal
        modalDetalle.style.display = 'flex';

        // Fetch de los items
        const { data: items, error } = await supabaseClient
            .from('pedido_items')
            .select('*')
            .eq('pedido_id', pedido.id);

        if (error) {
            listaProd.innerHTML = `<p style="color:red;">Error al cargar productos: ${error.message}</p>`;
            return;
        }

        if (!items || items.length === 0) {
            listaProd.innerHTML = '<p>No se encontraron productos para esta orden.</p>';
            return;
        }

        // Obtener imágenes
        const productoIds = items.map(i => i.producto_id);
        const { data: prods } = await supabaseClient.from('productos').select('id, imagen_url').in('id', productoIds);
        const imgMap = {};
        if (prods) {
            prods.forEach(p => { imgMap[p.id] = p.imagen_url; });
        }

        listaProd.innerHTML = '';
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'detalle-producto-item';
            div.style.cursor = 'pointer';
            div.title = 'Ver producto en la tienda';
            
            div.onclick = () => {
                window.location.href = `../index.html?productoId=${item.producto_id}`;
            };

            const imgUrl = imgMap[item.producto_id] || '../assets/img/ui/ferromarket.png';

            div.innerHTML = `
                <div style="display:flex; align-items:center; gap: 15px;">
                    <img src="${imgUrl}" alt="${item.nombre_producto}" style="width: 55px; height: 55px; object-fit: contain; border: 2px solid #000; border-radius: 8px; background: #fff; padding: 3px;">
                    <div>
                        <div class="dp-nombre">${item.nombre_producto}</div>
                        <div class="dp-cantidad">${item.cantidad} x $${(item.precio_unitario || 0).toLocaleString('es-CL')}</div>
                    </div>
                </div>
                <div class="dp-subtotal">$${(item.subtotal || (item.cantidad * item.precio_unitario)).toLocaleString('es-CL')}</div>
            `;
            listaProd.appendChild(div);
        });
    };
});
