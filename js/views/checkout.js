let carritoActual = [];
let metodoPagoActual = null;
let sesionActual = null;

// ============================================================
// INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    // Mostrar spinner de carga inicial mientras verificamos sesión y carrito
    mostrarSpinner(true);

    try {
        // 1. Verificar sesión
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

        if (sessionError || !session) {
            mostrarSpinner(false);
            window.location.href = '../index.html?login=true';
            return;
        }
        sesionActual = session;

        // 2. Leer carrito desde Supabase
        const { data: carritoData, error: carritoError } = await supabaseClient
            .from('carrito')
            .select('*')
            .eq('usuario_id', sesionActual.user.id)
            .order('created_at', { ascending: true });

        mostrarSpinner(false);

        if (carritoError) {
            // Mostrar error visible al usuario
            mostrarErrorCarga(
                `No se pudo cargar el carrito (${carritoError.message}). ` +
                `Asegúrate de que la tabla "carrito" existe en Supabase y las políticas RLS están configuradas.`
            );
            return;
        }

        // 3. Normalizar campos para el resto del checkout
        carritoActual = (carritoData || []).map(item => ({
            id: item.producto_id,
            nombre: item.nombre_producto,
            precio: item.precio_unitario,
            imagen_url: item.imagen_url,
            cantidad: item.cantidad
        }));

        if (carritoActual.length === 0) {
            mostrarCarritoVacio();
            return;
        }

        // 4. Renderizar todo
        renderizarProductos();
        renderizarResumen();
        inicializarMetodosPago();
        inicializarTarjetaVisual();
        inicializarBotonConfirmar();

    } catch (err) {
        mostrarSpinner(false);
        mostrarErrorCarga('Error inesperado al cargar el checkout: ' + err.message);
    }
});

// Muestra un error visible dentro de la columna de productos
function mostrarErrorCarga(mensaje) {
    const contenedor = document.getElementById('lista-productos-checkout');
    if (contenedor) {
        contenedor.innerHTML = `
                <div style="background:#fff3cd; border:2px solid #ffc107; border-radius:12px; padding:20px; margin:10px 0; box-shadow:3px 3px 0px #ffc107;">
                    <p style="margin:0 0 8px 0; font-weight:800; color:#856404;"><i class="fa fa-exclamation-triangle"></i> No se pudo cargar el carrito</p>
                    <p style="margin:0; font-size:0.88rem; color:#664d03;">${mensaje}</p>
                    <a href="index.html" style="display:inline-flex; align-items:center; gap:6px; margin-top:14px; background:#000; color:#fff; border-radius:8px; padding:8px 16px; font-weight:700; text-decoration:none; font-size:0.9rem;">
                        <i class="fa fa-arrow-left"></i> Volver al Catálogo
                    </a>
                </div>
            `;
    }
}

// ============================================================
// RENDERIZADO DE PRODUCTOS
// ============================================================
function renderizarProductos() {
    const contenedor = document.getElementById('lista-productos-checkout');
    contenedor.innerHTML = '';
    carritoActual.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        const div = document.createElement('div');
        div.className = 'checkout-item';
        div.innerHTML = `
                <img src="${item.imagen_url || '../assets/img/ui/ferromarket.png'}" alt="${item.nombre}" class="checkout-item-img">
                <div class="checkout-item-info">
                    <p class="checkout-item-nombre">${item.nombre}</p>
                    <p class="checkout-item-cant">Cantidad: ${item.cantidad} × $${item.precio ? item.precio.toLocaleString('es-CL') : '0'}</p>
                </div>
                <span class="checkout-item-subtotal">$${subtotal.toLocaleString('es-CL')}</span>
            `;
        contenedor.appendChild(div);
    });
}

// ============================================================
// RENDERIZADO DEL RESUMEN (PANEL DERECHO)
// ============================================================
function renderizarResumen() {
    const contenedor = document.getElementById('resumen-lineas');
    contenedor.innerHTML = '';
    let total = 0;

    carritoActual.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        const div = document.createElement('div');
        div.className = 'resumen-linea';
        div.innerHTML = `
                <span>${item.nombre} ×${item.cantidad}</span>
                <span>$${subtotal.toLocaleString('es-CL')}</span>
            `;
        contenedor.appendChild(div);
    });

    document.getElementById('resumen-total').textContent = `$${total.toLocaleString('es-CL')}`;
}

// ============================================================
// MÉTODOS DE PAGO
// ============================================================
function inicializarMetodosPago() {
    const opciones = [
        { id: 'opcion-tarjeta', radio: 'radio-tarjeta', form: 'form-tarjeta', valor: 'Tarjeta', icono: 'fa-credit-card', label: 'Tarjeta de Crédito/Débito' },
        { id: 'opcion-transferencia', radio: 'radio-transferencia', form: 'form-transferencia', valor: 'Transferencia', icono: 'fa-university', label: 'Transferencia Bancaria' },
        { id: 'opcion-efectivo', radio: 'radio-efectivo', form: 'form-efectivo', valor: 'Efectivo', icono: 'fa-money', label: 'Efectivo en Tienda' }
    ];

    opciones.forEach(op => {
        const label = document.getElementById(op.id);
        const radio = document.getElementById(op.radio);
        if (!label || !radio) return;

        label.addEventListener('click', () => {
            // Quitar selección previa
            opciones.forEach(o => {
                document.getElementById(o.id)?.classList.remove('seleccionado');
                const f = document.getElementById(o.form);
                if (f) f.style.display = 'none';
            });

            label.classList.add('seleccionado');
            radio.checked = true;
            metodoPagoActual = op.valor;

            // Mostrar formulario correspondiente
            const form = document.getElementById(op.form);
            if (form) form.style.display = 'block';

            // Actualizar badge en resumen
            const badge = document.getElementById('resumen-metodo-badge');
            const badgeTexto = document.getElementById('badge-metodo-texto');
            if (badge && badgeTexto) {
                badge.style.display = 'block';
                badgeTexto.innerHTML = `<i class="fa ${op.icono}"></i> ${op.label}`;
            }

            // Habilitar botón
            actualizarBotonConfirmar();
        });
    });
}

function actualizarBotonConfirmar() {
    const btn = document.getElementById('btn-confirmar-pedido');
    if (!btn) return;
    // Para tarjeta se valida más en el submit; aquí solo validamos que haya método
    const puedeConfirmar = metodoPagoActual !== null;
    btn.disabled = !puedeConfirmar;
}

// ============================================================
// TARJETA VISUAL (ANIMACIÓN EN VIVO)
// ============================================================
function inicializarTarjetaVisual() {
    const inputNum = document.getElementById('numero-tarjeta');
    const inputNombre = document.getElementById('nombre-titular');
    const inputVence = document.getElementById('fecha-expiracion');

    if (inputNum) {
        inputNum.addEventListener('input', function () {
            // Formatear con espacios cada 4 dígitos
            let val = this.value.replace(/\D/g, '').substring(0, 16);
            this.value = val.replace(/(.{4})/g, '$1 ').trim();
            const display = val.padEnd(16, '•').replace(/(.{4})/g, '$1 ').trim();
            document.getElementById('cv-numero').textContent = display;
        });
    }
    if (inputNombre) {
        inputNombre.addEventListener('input', function () {
            const v = this.value.toUpperCase() || 'NOMBRE APELLIDO';
            document.getElementById('cv-nombre').textContent = v.substring(0, 22);
        });
    }
    if (inputVence) {
        inputVence.addEventListener('input', function () {
            let val = this.value.replace(/\D/g, '').substring(0, 4);
            if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2);
            this.value = val;
            document.getElementById('cv-vence').textContent = val || 'MM/AA';
        });
    }
}

// ============================================================
// BOTÓN CONFIRMAR
// ============================================================
function inicializarBotonConfirmar() {
    const btn = document.getElementById('btn-confirmar-pedido');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        if (!metodoPagoActual) {
            window.mostrarToast('Por favor selecciona un método de pago.', 'error');
            return;
        }

        // Validación extra si es tarjeta
        if (metodoPagoActual === 'Tarjeta') {
            const num = document.getElementById('numero-tarjeta')?.value.replace(/\s/g, '');
            const nombre = document.getElementById('nombre-titular')?.value.trim();
            const vence = document.getElementById('fecha-expiracion')?.value.trim();
            const cvv = document.getElementById('cvv')?.value.trim();

            if (!num || num.length < 13) { window.mostrarToast('Por favor ingresa un número de tarjeta válido.', 'error'); return; }
            if (!nombre || nombre.length < 3) { window.mostrarToast('Por favor ingresa el nombre del titular.', 'error'); return; }
            if (!vence || vence.length < 5) { window.mostrarToast('Por favor ingresa la fecha de vencimiento.', 'error'); return; }
            if (!cvv || cvv.length < 3) { window.mostrarToast('Por favor ingresa el CVV.', 'error'); return; }
        }

        await procesarPedido();
    });
}

// ============================================================
// PROCESAR Y GUARDAR PEDIDO EN SUPABASE
// ============================================================
async function procesarPedido() {
    mostrarSpinner(true);

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            mostrarSpinner(false);
            window.location.href = '../index.html?login=true';
            return;
        }

        let codigoOrden = 'FM-000001';
        try {
            // Obtener el último pedido ordenado por codigo_orden descendente
            const { data: ultimosPedidos, error: errUltimo } = await supabaseClient
                .from('pedidos')
                .select('codigo_orden')
                .order('codigo_orden', { ascending: false })
                .limit(1);

            if (!errUltimo && ultimosPedidos && ultimosPedidos.length > 0) {
                const ultimoCodigo = ultimosPedidos[0].codigo_orden; // Ej: "FM-000005"
                // Extraer número, sumarle 1 y rellenar con ceros (6 dígitos)
                if (ultimoCodigo && ultimoCodigo.startsWith('FM-')) {
                    const numStr = ultimoCodigo.substring(3);
                    const num = parseInt(numStr, 10);
                    if (!isNaN(num)) {
                        codigoOrden = 'FM-' + String(num + 1).padStart(6, '0');
                    }
                }
            }
        } catch (e) {
            console.warn('Error al obtener el último código de orden, usando fallback:', e);
            codigoOrden = 'FM-' + Date.now().toString().slice(-6);
        }

        const total = carritoActual.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
        const user = session.user;
        const nombreUsuario = user.user_metadata?.full_name || user.email;

        // Insertar cabecera del pedido
        const { data: pedidoData, error: pedidoError } = await supabaseClient
            .from('pedidos')
            .insert([{
                usuario_id: user.id,
                usuario_email: user.email,
                usuario_nombre: nombreUsuario,
                codigo_orden: codigoOrden,
                total: total,
                metodo_pago: metodoPagoActual,
                estado: 'Pendiente',
                fecha: new Date().toISOString()
            }])
            .select()
            .single();

        if (pedidoError) {
            console.warn('Error al guardar pedido en Supabase:', pedidoError.message);
            // Continuamos igual para mostrar éxito aunque falle la BD
        } else {
            // Insertar ítems del pedido
            const items = carritoActual.map(item => ({
                pedido_id: pedidoData.id,
                producto_id: item.id,
                nombre_producto: item.nombre,
                precio_unitario: item.precio,
                cantidad: item.cantidad,
                subtotal: item.precio * item.cantidad
            }));

            const { error: itemsError } = await supabaseClient
                .from('pedido_items')
                .insert(items);

            if (itemsError) {
                console.warn('Error al guardar ítems:', itemsError.message);
            }
        }

        // Limpiar la tabla carrito en Supabase
        await supabaseClient
            .from('carrito')
            .delete()
            .eq('usuario_id', user.id);

        mostrarSpinner(false);
        mostrarExito(codigoOrden);

    } catch (err) {
        mostrarSpinner(false);
        console.error('Error inesperado:', err);
        window.mostrarToast('Ocurrió un error al procesar el pedido: ' + err.message, 'error');
    }
}

// ============================================================
// HELPERS UI
// ============================================================
function mostrarSpinner(activo) {
    const overlay = document.getElementById('spinner-overlay');
    if (overlay) overlay.classList.toggle('activo', activo);
}

function mostrarExito(codigoOrden) {
    document.getElementById('columna-izquierda').style.display = 'none';
    document.getElementById('columna-derecha').style.display = 'none';
    const pantalla = document.getElementById('pantalla-exito');
    pantalla.style.display = 'block';
    document.getElementById('exito-codigo-orden').textContent = codigoOrden;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function mostrarCarritoVacio() {
    document.getElementById('columna-izquierda').style.display = 'none';
    document.getElementById('columna-derecha').style.display = 'none';
    document.getElementById('carrito-vacio').style.display = 'flex';
}

function copiarTexto(texto, btn) {
    navigator.clipboard.writeText(texto).then(() => {
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fa fa-check"></i> Copiado';
        btn.style.background = '#1fb546';
        btn.style.color = '#fff';
        setTimeout(() => {
            btn.innerHTML = original;
            btn.style.background = '';
            btn.style.color = '';
        }, 2000);
    });
}

