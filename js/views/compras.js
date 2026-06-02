document.addEventListener("DOMContentLoaded", async () => {
    const listaContainer = document.getElementById('lista-compras-container');
    const modalDetalle = document.getElementById('modal-detalle-compra');
    const btnCerrarDetalle = document.getElementById('btn-cerrar-detalle');

    // Cerrar modal
    btnCerrarDetalle.addEventListener('click', () => {
        modalDetalle.style.display = 'none';
    });

    try {
        // 1. Obtener usuario logueado
        const { data: { session }, error: authError } = await supabaseClient.auth.getSession();
        if (authError || !session) {
            window.location.href = '../index.html?login=true';
            return;
        }

        const userId = session.user.id;

        // 2. Obtener pedidos del usuario
        const { data: pedidos, error: pedidosError } = await supabaseClient
            .from('pedidos')
            .select('*')
            .eq('usuario_id', userId)
            .order('fecha', { ascending: false });

        if (pedidosError) {
            console.error(pedidosError);
            listaContainer.innerHTML = `<p style="text-align:center; color:red;">Error al cargar compras: ${pedidosError.message}</p>`;
            return;
        }

        // 3. Renderizar pedidos
        if (!pedidos || pedidos.length === 0) {
            listaContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; background: #fff; border: 2px dashed #000; border-radius: 12px;">
                    <i class="fa fa-shopping-basket" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
                    <h3>No tienes compras aún</h3>
                    <p style="color: #666; margin-top: 5px;">Tus pedidos aparecerán aquí.</p>
                </div>
            `;
            return;
        }

        listaContainer.innerHTML = ''; // Limpiar loader

        pedidos.forEach(pedido => {
            const card = document.createElement('div');
            card.className = 'compra-card';

            const fechaFormat = new Date(pedido.fecha).toLocaleDateString('es-CL', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            let claseEstado = 'estado-pendiente';
            if (pedido.estado.toLowerCase() === 'completado') claseEstado = 'estado-completado';
            if (pedido.estado.toLowerCase() === 'cancelado') claseEstado = 'estado-cancelado';

            card.innerHTML = `
                <div class="compra-info">
                    <span class="compra-codigo">${pedido.codigo_orden}</span>
                    <span class="compra-fecha">${fechaFormat}</span>
                    <div class="compra-detalles-mini">
                        <span class="compra-estado ${claseEstado}">${pedido.estado}</span>
                        <span class="compra-total">$${pedido.total.toLocaleString('es-CL')}</span>
                    </div>
                </div>
                <button class="btn-ver-detalle" data-id="${pedido.id}">
                    <i class="fa fa-eye"></i> Ver Detalle
                </button>
            `;

            listaContainer.appendChild(card);
        });

        // 4. Agregar eventos a los botones de ver detalle
        const btnsVerDetalle = document.querySelectorAll('.btn-ver-detalle');
        btnsVerDetalle.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const pedidoId = e.currentTarget.getAttribute('data-id');
                const pedido = pedidos.find(p => p.id == pedidoId);
                await abrirDetallePedido(pedido);
            });
        });

    } catch (err) {
        console.error('Error general:', err);
        listaContainer.innerHTML = `<p style="text-align:center; color:red;">Error inesperado al cargar la página.</p>`;
    }

    async function abrirDetallePedido(pedido) {
        // Llenar info básica
        document.getElementById('detalle-codigo-orden').textContent = pedido.codigo_orden;
        
        const fechaFormat = new Date(pedido.fecha).toLocaleDateString('es-CL', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        document.getElementById('detalle-fecha').textContent = fechaFormat;
        document.getElementById('detalle-pago').textContent = pedido.metodo_pago || 'No especificado';
        document.getElementById('detalle-total-monto').textContent = `$${pedido.total.toLocaleString('es-CL')}`;

        const estadoSpan = document.getElementById('detalle-estado');
        estadoSpan.textContent = pedido.estado;
        estadoSpan.className = 'badge-estado';
        if (pedido.estado.toLowerCase() === 'completado') estadoSpan.classList.add('estado-completado');
        else if (pedido.estado.toLowerCase() === 'cancelado') estadoSpan.classList.add('estado-cancelado');
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

        // Obtener imágenes de los productos
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
            div.title = 'Ver producto';
            
            // Redirigir a index.html y abrir modal
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
    }
});
