let usuariosList = [];
        function esUsuarioAdmin(user) {
            if (!user) return false;
            return user.email === 'admin@ferromarket.cl' || user.user_metadata?.role === 'admin';
        }
        async function verificarAcceso() {
            try {
                const { data } = await supabaseClient.auth.getSession();
                if (!data.session || !esUsuarioAdmin(data.session.user)) {
                    window.mostrarToast('Acceso denegado. Se requieren credenciales de administrador.', 'error');
                    setTimeout(() => {
                        window.location.href = '../index.html';
                    }, 1500);
                    return;
                }
                
                // Mostrar panel y ocultar loader
                document.getElementById('loader-pantalla').style.display = 'none';
                document.getElementById('contenido-gestion-dashboard').style.display = 'block';
                
                // Inicializar buscador
                const inputBuscador = document.getElementById('buscador-usuarios');
                if (inputBuscador) {
                    inputBuscador.addEventListener('input', (e) => {
                        const termino = e.target.value.toLowerCase();
                        const listaFiltrada = usuariosList.filter(u => {
                            const nombre = (u.full_name || '').toLowerCase();
                            const email = (u.email || '').toLowerCase();
                            return nombre.includes(termino) || email.includes(termino);
                        });
                        renderizarTablaUsuarios(listaFiltrada);
                    });
                }

                // Cargar tabla de usuarios
                cargarUsuariosTable();
            } catch (err) {
                console.error('Error al verificar sesión:', err);
                window.mostrarToast('Error al verificar sesión: ' + err.message, 'error');
                window.location.href = '../index.html';
            }
        }
        async function cargarUsuariosTable() {
            const tbody = document.getElementById('tabla-usuarios-body');
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;"><i class="fa fa-spinner fa-spin"></i> Cargando usuarios...</td></tr>';
            
            let profiles = [];
            try {
                const { data, error } = await supabaseClient.from('profiles').select('*');
                if (error) throw error;
                profiles = data || [];
            } catch (err) {
                console.error('Error al leer tabla "profiles":', err);
            }
            
            usuariosList = profiles;
            renderizarTablaUsuarios(usuariosList);
        }

        function renderizarTablaUsuarios(listaParaMostrar) {
            const tbody = document.getElementById('tabla-usuarios-body');
            tbody.innerHTML = '';
            
            if (listaParaMostrar.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No se encontraron usuarios.</td></tr>';
                return;
            }
            
            listaParaMostrar.forEach((user) => {
                const indexOriginal = usuariosList.indexOf(user);
                const tr = document.createElement('tr');
                
                const rolBadge = user.role === 'admin' 
                    ? '<span class="badge-rol-gestion admin">Superadmin</span>' 
                    : '<span class="badge-rol-gestion">Cliente</span>';
                
                const estadoBadge = user.status === 'Inactivo' 
                    ? '<span class="badge-estado-gestion inactivo">Inactivo</span>' 
                    : '<span class="badge-estado-gestion">Activo</span>';
                
                tr.innerHTML = `
                    <td style="font-weight: bold;">${user.full_name || 'Sin Nombre'}</td>
                    <td style="color: #555;">${user.email}</td>
                    <td>${rolBadge}</td>
                    <td>${estadoBadge}</td>
                    <td>
                        <div class="tabla-acciones">
                            <button class="btn-tabla-ver-compras" onclick="verComprasUsuario(${indexOriginal})"><i class="fa fa-shopping-bag"></i> Ver Compras</button>
                            <button class="btn-tabla-eliminar" onclick="eliminarUsuario(${indexOriginal})"><i class="fa fa-trash"></i></button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
        async function verComprasUsuario(index) {
            const user = usuariosList[index];
            if (!user) return;
            
            const modalContainer = document.getElementById('modal-container-dashboard');
            modalContainer.innerHTML = '';
            const template = document.getElementById('plantilla-modal-compras-usuario');
            if (!template) return;
            
            const clone = template.content.cloneNode(true);
            const modal = clone.querySelector('.modal');
            const titulo = clone.querySelector('#titulo-compras-usuario');
            const listaContenedor = clone.querySelector('#lista-compras-contenedor');
            
            titulo.innerHTML = `<i class="fa fa-shopping-bag" style="color: var(--color-principal);"></i> Compras de ${user.full_name || user.email}`;
            listaContenedor.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fa fa-spinner fa-spin fa-2x"></i><p>Cargando compras...</p></div>';
            
            // Mostrar modal mientras carga
            modal.style.display = 'block';
            clone.querySelector('.cerrar-modal').onclick = function() {
                modal.style.display = 'none';
                modalContainer.innerHTML = '';
            };
            window.onclick = function(event) {
                if (event.target == modal) {
                    modal.style.display = 'none';
                    modalContainer.innerHTML = '';
                }
            };
            modalContainer.appendChild(clone);

            // --- LEER COMPRAS DESDE SUPABASE ---
            let compras = [];

            try {
                const { data, error } = await supabaseClient
                    .from('pedidos')
                    .select(`
                        id,
                        codigo_orden,
                        total,
                        metodo_pago,
                        estado,
                        fecha,
                        pedido_items (
                            nombre_producto,
                            cantidad,
                            precio_unitario,
                            subtotal
                        )
                    `)
                    .eq('usuario_email', user.email)
                    .order('fecha', { ascending: false });

                if (error) {
                    console.warn('Error al consultar pedidos:', error.message);
                } else {
                    compras = data || [];
                }
            } catch (err) {
                console.error('Excepción al consultar Supabase:', err);
            }

            // --- RENDERIZAR COMPRAS ---
            const renderizarListaCompras = (lista) => {
                const listaEl = document.getElementById('lista-compras-contenedor');
                if (!listaEl) return;

                if (lista.length === 0) {
                    listaEl.innerHTML = '<div style="text-align: center; padding: 30px; color: #777; font-weight: 600;"><i class="fa fa-folder-open-o fa-2x" style="display:block; margin-bottom:10px;"></i>No se encontraron compras para mostrar.</div>';
                } else {
                    listaEl.innerHTML = '';

                    lista.forEach(compra => {
                        const card = document.createElement('div');
                        card.className = 'compras-card-pedido';

                        let statusClass = 'pendiente';
                        if (compra.estado === 'Entregado') statusClass = 'entregado';
                        if (compra.estado === 'En tránsito') statusClass = 'transito';

                        // Formatear fecha
                        let fechaFormato = compra.fecha || 'N/A';
                        if (compra.fecha) {
                            try {
                                const d = new Date(compra.fecha);
                                fechaFormato = d.toLocaleDateString('es-CL', { day:'2-digit', month:'2-digit', year:'numeric' });
                            } catch {}
                        }

                        // Ítems detallados
                        let itemsHtml = '';
                        if (compra.pedido_items && compra.pedido_items.length > 0) {
                            itemsHtml = '<ul style="margin:8px 0 0 0; padding-left:18px; font-size:0.88rem; color:#555;">';
                            compra.pedido_items.forEach(it => {
                                itemsHtml += `<li>${it.cantidad}x <strong>${it.nombre_producto}</strong> — $${(it.subtotal || 0).toLocaleString('es-CL')}</li>`;
                            });
                            itemsHtml += '</ul>';
                        }

                        // Método de pago icon
                        const iconoMetodo = {
                            'Tarjeta': 'fa-credit-card',
                            'Transferencia': 'fa-university',
                            'Efectivo': 'fa-money',
                            'N/A': 'fa-question'
                        }[compra.metodo_pago] || 'fa-shopping-bag';

                        card.innerHTML = `
                            <div class="compras-header">
                                <span class="pedido-id-badge">${compra.codigo_orden}</span>
                                <span style="font-size: 0.9rem; color: #666;"><i class="fa fa-calendar"></i> ${fechaFormato}</span>
                            </div>
                            <div class="compras-detalles">
                                <span style="font-size:0.82rem; color:#888; margin-bottom:4px; display:block;"><i class="fa ${iconoMetodo}"></i> ${compra.metodo_pago}</span>
                                <strong>Detalle:</strong>${itemsHtml || ' Sin detalles'}
                            </div>
                            <div class="compras-footer">
                                <span class="status-badge ${statusClass}">${compra.estado}</span>
                                <span style="color: var(--color-principal); font-size: 1.1rem;">$${(compra.total || 0).toLocaleString('es-CL')}</span>
                            </div>
                        `;
                        listaEl.appendChild(card);
                    });
                }
            };
            
            // Render inicial
            renderizarListaCompras(compras);
            
            // Inicializar buscador y filtros del modal de compras
            const inputBuscadorCodigo = document.getElementById('buscador-compras-codigo');
            const inputFiltroFecha = document.getElementById('filtro-compras-fecha');
            const selectFiltroEstado = document.getElementById('filtro-compras-estado');
            
            const aplicarFiltrosCompras = () => {
                const terminoCodigo = (inputBuscadorCodigo?.value || '').toLowerCase();
                const terminoFecha = inputFiltroFecha?.value || ''; // formato YYYY-MM-DD
                const terminoEstado = (selectFiltroEstado?.value || '').toLowerCase();
                
                let fechaObj = null;
                if (terminoFecha) {
                    const partes = terminoFecha.split('-');
                    if (partes.length === 3) {
                        fechaObj = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
                    }
                }
                
                const listaFiltrada = compras.filter(c => {
                    // 1. Filtro por código
                    const codigo = (c.codigo_orden || '').toLowerCase();
                    if (terminoCodigo && !codigo.includes(terminoCodigo)) {
                        return false;
                    }
                    
                    // 2. Filtro por estado
                    const estado = (c.estado || '').toLowerCase();
                    if (terminoEstado && estado !== terminoEstado) {
                        return false;
                    }
                    
                    // 3. Filtro por fecha exacta
                    if (fechaObj && c.fecha) {
                        const d = new Date(c.fecha);
                        if (d.getFullYear() !== fechaObj.getFullYear() || 
                            d.getMonth() !== fechaObj.getMonth() || 
                            d.getDate() !== fechaObj.getDate()) {
                            return false;
                        }
                    } else if (fechaObj && !c.fecha) {
                        return false;
                    }
                    
                    return true;
                });
                renderizarListaCompras(listaFiltrada);
            };

            if (inputBuscadorCodigo) inputBuscadorCodigo.addEventListener('input', aplicarFiltrosCompras);
            if (inputFiltroFecha) inputFiltroFecha.addEventListener('change', aplicarFiltrosCompras);
            if (selectFiltroEstado) selectFiltroEstado.addEventListener('change', aplicarFiltrosCompras);
        }
        async function eliminarUsuario(index) {
            const user = usuariosList[index];
            if (!user) return;
            
            // Evitar borrar el propio administrador con el que se está conectado
            const { data: { session } } = await supabaseClient.auth.getSession();
            const idUsuario = session?.user?.id;
            const userLogueadoId = idUsuario;
            if (idUsuario === userLogueadoId) {
                window.mostrarToast('No puedes eliminar tu propio usuario de administrador mientras estés en sesión.', 'error');
                return;
            }
            
            window.mostrarConfirmacion(`¿Estás seguro de que deseas eliminar al usuario "${user.full_name || user.email}"?\n\nEsta acción eliminará su perfil de la base de datos.`, async () => {
                try {
                    const { data, error, count } = await supabaseClient
                        .from('profiles')
                        .delete({ count: 'exact' })
                        .eq('id', user.id);
                    
                    if (error) {
                        console.error('Error al eliminar usuario:', error);
                        window.mostrarToast('Error al eliminar usuario en la base de datos: ' + error.message, 'error');
                    } else if (count === 0) {
                        console.warn('Usuario no encontrado o RLS bloquea el borrado');
                        window.mostrarToast('Error: No se pudo eliminar el usuario. Esto ocurre si las políticas RLS en la tabla "profiles" de Supabase están activas y bloquean la eliminación.', 'error');
                    } else {
                        window.mostrarToast('¡Usuario eliminado correctamente!', 'success');
                        cargarUsuariosTable();
                    }
                } catch (err) {
                    window.mostrarToast('Error inesperado: ' + err.message, 'error');
                }
            });
        }
        // Limpieza completada
        // Ejecutar verificación al cargar
        document.addEventListener('DOMContentLoaded', verificarAcceso);

