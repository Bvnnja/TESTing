
// --- SUPABASE CONFIGURACIÓN ---
const SUPABASE_URL = 'https://fhvinwdaaybnwxpsivsi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZodmlud2RhYXlibnd4cHNpdnNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNjg2OTMsImV4cCI6MjA4ODk0NDY5M30.S0wYDW7utGuqRRCMu-k9w8FQ9mAWkk-92aX_GzZJ08E';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function cargarProductos() {
  const { data, error } = await supabaseClient
    .from('productos')
    .select('*');
  if (error) return;
  renderizarProductos(data);
  renderizarBotonesFiltro(data);
}

function renderizarProductos(productos) {
  const contenedor = document.getElementById("contenedor-productos");
  contenedor.innerHTML = '';
  if (productos && productos.length) {
    const template = document.getElementById('plantilla-producto');
    productos.forEach((producto, idx) => {
      const clone = template.content.cloneNode(true);
      const card = clone.querySelector('.tarjeta-producto');
      card.setAttribute('data-idx', idx);
      const img = card.querySelector('img');
      img.src = producto.imagen_url;
      img.alt = producto.nombre;
      card.querySelector('h3').textContent = producto.nombre;
      card.querySelector('.descripcion-producto').textContent = producto.descripcion;
      card.querySelector('.precio-producto').textContent = producto.precio ? `$${producto.precio.toLocaleString('es-CL', {minimumFractionDigits: 0})}` : '';
      card.querySelector('.cantidad-producto').textContent = `Cantidad: ${producto.cantidad}`;
      card.onclick = function() {
        mostrarModal(productos[idx]);
      };
      contenedor.appendChild(clone);
    });
  } else {
    contenedor.innerHTML = '<p>No hay productos en esta categoría.</p>';
  }
}

function mostrarModal(producto) {
  const modalContainer = document.getElementById('modal-container');
  modalContainer.innerHTML = '';
  const template = document.getElementById('plantilla-modal-producto');
  const clone = template.content.cloneNode(true);
  const modal = clone.querySelector('.modal');
  // Rellenar datos principales
  const imgPrincipal = clone.querySelector('.modal-img-principal');
  imgPrincipal.src = producto.imagen_url;
  imgPrincipal.alt = producto.nombre;
  clone.querySelector('.modal-titulo').textContent = producto.nombre;
  // Descripción corta y completa
  const descCorta = producto.descripcion?.length > 60 ? producto.descripcion.slice(0, 60) + '...' : producto.descripcion;
  clone.querySelector('.modal-descripcion-corta').textContent = descCorta;
  // Botón ver más
  const btnVerMas = clone.querySelector('.modal-ver-mas');
  btnVerMas.onclick = function() {
    clone.querySelector('.modal-descripcion-corta').textContent = producto.descripcion;
    btnVerMas.style.display = 'none';
  };
  // Precio
  clone.querySelector('.modal-precio').textContent = producto.precio ? `CLP$  ${producto.precio.toLocaleString('es-CL', {minimumFractionDigits: 0})}` : '';
  // Cantidad (input y botones)
  const inputCantidad = clone.querySelector('.modal-cantidad-input');
  inputCantidad.value = 1;
  inputCantidad.max = producto.cantidad;
  clone.querySelector('.modal-cantidad-menos').onclick = function() {
    if (parseInt(inputCantidad.value) > 1) inputCantidad.value--;
  };
  clone.querySelector('.modal-cantidad-mas').onclick = function() {
    if (parseInt(inputCantidad.value) < producto.cantidad) inputCantidad.value++;
  };
  // Botón agregar al carrito
  clone.querySelector('.modal-agregar-carrito').onclick = function() {
    const cant = parseInt(inputCantidad.value) || 1;
    agregarAlCarrito(producto, cant);
    modal.style.display = 'none';
    modalContainer.innerHTML = '';
  };
  // Botón calificar (solo visual)
  clone.querySelector('.modal-calificar').onclick = function() {
    alert('¡Gracias por tu calificación! (demo visual)');
  };
  // Mostrar modal
  modal.style.display = 'block';
  // Cerrar modal al hacer click en la X
  clone.querySelector('.cerrar-modal').onclick = function() {
    modal.style.display = 'none';
    setTimeout(() => { modalContainer.innerHTML = ''; }, 300);
  };
  // Cerrar modal al hacer click fuera del contenido
  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = 'none';
      setTimeout(() => { modalContainer.innerHTML = ''; }, 300);
    }
  };
  modalContainer.appendChild(clone);
}

function renderizarBotonesFiltro(productos) {
  const contenedor = document.querySelector('.contenedor-filtros');
  if (!contenedor) return;
  const btns = contenedor.querySelectorAll('.btn');
  btns.forEach(btn => {
    const filtro = btn.getAttribute('data-categoria');
    // Si no es el filtro de 'todos', verificar si hay productos en la categoría
    if (filtro && filtro !== 'todos') {
      const tieneProductos = productos && productos.some(p => String(p.categoria) === filtro);
      if (tieneProductos) {
        btn.style.display = ''; // Mostrar
      } else {
        btn.style.display = 'none'; // Ocultar
      }
    } else {
      btn.style.display = ''; // Siempre mostrar el botón "Todos"
    }
    btn.onclick = e => {
      e.preventDefault();
      activarBoton(btn);
      const filtro = btn.getAttribute('data-categoria');
      if (!filtro || filtro === 'todos') {
        renderizarProductos(productos);
      } else {
        renderizarProductos(productos.filter(p => String(p.categoria) === filtro));
      }
    };
  });
}

function activarBoton(boton) {
  const current = document.querySelector('.filtros.btn.active');
  if (current) current.classList.remove('active');
  boton.classList.add('active');
}

function inicializarHamburguesa() {
  const boton = document.getElementById('boton-hamburguesa');
  const filtros = document.querySelector('.contenedor-filtros');
  if (boton && filtros) {
    boton.onclick = function() {
      filtros.classList.toggle('mostrar');
      const icono = boton.querySelector('i');
      if (icono) {
        if (filtros.classList.contains('mostrar')) {
          icono.className = 'fa fa-times';
        } else {
          icono.className = 'fa fa-bars';
        }
      }
    };
    // Cerrar el menú al hacer click en cualquier filtro en móvil
    const btns = filtros.querySelectorAll('.filtros');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.innerWidth <= 900) {
          filtros.classList.remove('mostrar');
          const icono = boton.querySelector('i');
          if (icono) icono.className = 'fa fa-bars';
        }
      });
    });
  }
}

function actualizarInterfazUsuario(user) {
  const btnLogin = document.getElementById('btn-login');
  if (!btnLogin) return;

  const menu = document.getElementById('menu-desplegable-usuario');
  // Limpiar opciones dinámicas previas del admin
  if (menu) {
    const opcionesPrevias = menu.querySelectorAll('.opcion-admin-dinamica');
    opcionesPrevias.forEach(opt => opt.remove());
  }

  if (user) {
    // Usuario está logueado
    const nombre = user.user_metadata?.full_name || user.email;
    const primerNombre = nombre.split(' ')[0];

    // Cambiamos el texto al primer nombre
    const textSpan = btnLogin.querySelector('.btn-login-texto');
    if (textSpan) {
      textSpan.textContent = primerNombre;
    }

    // Asegurar que el icono sea el de usuario
    const icono = btnLogin.querySelector('i');
    if (icono) {
      icono.className = 'fa fa-user-circle';
    }

    // Al hacer clic, desplegar/ocultar el menú
    btnLogin.onclick = function(e) {
      e.stopPropagation();
      if (menu) {
        menu.classList.toggle('mostrar');
      }
    };

    // Si es administrador, agregar opciones de gestión
    if (esUsuarioAdmin(user)) {
      const divisor = menu.querySelector('.divisor-menu-usuario');
      if (divisor) {
        // Crear opción Gestionar Productos (Redirecciona a la nueva página dedicada)
        const optProductos = document.createElement('a');
        optProductos.href = '#';
        optProductos.className = 'opcion-menu-usuario opcion-admin-dinamica';
        optProductos.innerHTML = '<i class="fa fa-cubes"></i> Gestionar Productos';
        optProductos.onclick = function(e) {
          e.preventDefault();
          e.stopPropagation();
          menu.classList.remove('mostrar');
          window.location.href = 'gestion-productos.html';
        };

        // Crear opción Gestionar Usuarios (Redirecciona a la nueva página dedicada)
        const optUsuarios = document.createElement('a');
        optUsuarios.href = '#';
        optUsuarios.className = 'opcion-menu-usuario opcion-admin-dinamica';
        optUsuarios.innerHTML = '<i class="fa fa-users"></i> Gestionar Usuarios';
        optUsuarios.onclick = function(e) {
          e.preventDefault();
          e.stopPropagation();
          menu.classList.remove('mostrar');
          window.location.href = 'gestion-usuarios.html';
        };

        menu.insertBefore(optProductos, divisor);
        menu.insertBefore(optUsuarios, divisor);
      }
    }

    // Configurar clic de "Cerrar sesión" en el menú desplegable
    const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
    if (btnCerrarSesion) {
      btnCerrarSesion.onclick = async function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (menu) menu.classList.remove('mostrar');

        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
          const { error } = await supabaseClient.auth.signOut();
          if (error) {
            alert('Error al cerrar sesión: ' + error.message);
          } else {
            alert('Sesión cerrada correctamente.');
            actualizarInterfazUsuario(null);
          }
        }
      };
    }

    // Configurar clics para las otras opciones (Datos personales, Compras)
    const opcionesDemo = menu ? menu.querySelectorAll('.opcion-menu-usuario:not(.cerrar-sesion):not(.opcion-admin-dinamica)') : [];
    opcionesDemo.forEach(opcion => {
      opcion.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (menu) menu.classList.remove('mostrar');
        alert(`Opción "${opcion.textContent.trim()}" en desarrollo.`);
      };
    });

  } else {
    // Usuario no está logueado
    if (menu) {
      menu.classList.remove('mostrar');
    }

    const textSpan = btnLogin.querySelector('.btn-login-texto');
    if (textSpan) {
      textSpan.textContent = 'Iniciar Sesión';
    }
    const icono = btnLogin.querySelector('i');
    if (icono) {
      icono.className = 'fa fa-user-circle';
    }

    btnLogin.onclick = function() {
      mostrarModalLogin();
    };
  }
}

// Cerrar menú al hacer clic fuera del mismo
window.addEventListener('click', function(e) {
  const menu = document.getElementById('menu-desplegable-usuario');
  const btnLogin = document.getElementById('btn-login');
  if (menu && menu.classList.contains('mostrar')) {
    if (!menu.contains(e.target) && !btnLogin.contains(e.target)) {
      menu.classList.remove('mostrar');
    }
  }
});

function mostrarModalLogin() {
  // Eliminar cualquier modal anterior
  const modalContainer = document.getElementById('modal-container');
  modalContainer.innerHTML = '';
  const template = document.getElementById('plantilla-modal-login');
  if (!template) return;
  const clone = template.content.cloneNode(true);
  const modal = clone.querySelector('.modal');

  // Manejo del envío del formulario
  const form = clone.querySelector('#formulario-login');
  if (form) {
    form.onsubmit = async function(e) {
      e.preventDefault();
      const email = form.querySelector('#login-email').value;
      const password = form.querySelector('#login-password').value;

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Ingresando...';
      submitBtn.disabled = true;

      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email: email,
          password: password
        });

        submitBtn.textContent = originalText;
        submitBtn.disabled = false;

        if (error) {
          alert('Error al iniciar sesión: ' + error.message);
          return;
        }

        alert('¡Sesión iniciada con éxito!');
        modal.style.display = 'none';
        setTimeout(() => { modalContainer.innerHTML = ''; }, 300);
      } catch (err) {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        alert('Ocurrió un error inesperado: ' + err.message);
      }
    };
  }

  // Manejo de iniciar sesión con Google
  const btnGoogle = clone.querySelector('#btn-login-google');
  if (btnGoogle) {
    btnGoogle.onclick = async function() {
      try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + window.location.pathname
          }
        });
        if (error) {
          alert('Error al iniciar sesión con Google: ' + error.message);
        }
      } catch (err) {
        alert('Ocurrió un error inesperado: ' + err.message);
      }
    };
  }

  // Mostrar modal
  modal.style.display = 'block';

  // Cerrar modal al hacer click en la X
  clone.querySelector('.cerrar-modal').onclick = function() {
    modal.style.display = 'none';
    setTimeout(() => { modalContainer.innerHTML = ''; }, 300);
  };

  // Cerrar modal al hacer click fuera del contenido
  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = 'none';
      setTimeout(() => { modalContainer.innerHTML = ''; }, 300);
    }
  };

  modalContainer.appendChild(clone);
}

function inicializarLogin() {
  // Escuchar cambios de estado de autenticación de Supabase (y setea el estado inicial)
  supabaseClient.auth.onAuthStateChange((event, session) => {
    window.currentUser = session ? session.user : null;
    actualizarInterfazUsuario(window.currentUser);
  });

  // Verificar si venimos de registro.html con ?login=true
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('login') === 'true') {
    // Dar un pequeño delay para cargar el estado de sesión actual antes de decidir mostrar el modal
    setTimeout(async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        mostrarModalLogin();
      }
    }, 150);
    // Limpiar el parámetro de la URL sin recargar la página para una experiencia limpia
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  cargarProductos();
  inicializarHamburguesa();
  inicializarLogin();
  inicializarCarrito();
});

// --- FUNCIONES DE ADMINISTRACIÓN ---
function esUsuarioAdmin(user) {
  if (!user) return false;
  return user.email === 'admin@ferromarket.cl' || user.user_metadata?.role === 'admin';
}

// ============================================================
// --- CARRITO DE COMPRAS ---
// ============================================================

const CARRITO_KEY = 'ferromarket_carrito';

function obtenerCarrito() {
  try {
    return JSON.parse(localStorage.getItem(CARRITO_KEY)) || [];
  } catch {
    return [];
  }
}

function guardarCarrito(carrito) {
  localStorage.setItem(CARRITO_KEY, JSON.stringify(carrito));
}

function agregarAlCarrito(producto, cantidad) {
  const carrito = obtenerCarrito();
  const existente = carrito.find(item => item.id === producto.id);
  if (existente) {
    existente.cantidad += cantidad;
  } else {
    carrito.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      imagen_url: producto.imagen_url,
      cantidad: cantidad
    });
  }
  guardarCarrito(carrito);
  renderizarCarrito();
  actualizarBadgeCarrito();
  abrirCarrito();
}

function renderizarCarrito() {
  const contenedor = document.getElementById('carrito-drawer-productos');
  const totalEl = document.getElementById('carrito-total-monto');
  if (!contenedor) return;

  const carrito = obtenerCarrito();
  contenedor.innerHTML = '';

  if (carrito.length === 0) {
    contenedor.innerHTML = '<div style="text-align:center; padding: 40px 20px; color:#999; font-size:1rem;"><i class="fa fa-shopping-cart" style="font-size:2.5rem; margin-bottom:12px; display:block;"></i>Tu carrito está vacío</div>';
    if (totalEl) totalEl.textContent = '$0';
    return;
  }

  let total = 0;
  carrito.forEach((item, idx) => {
    const subtotal = item.precio * item.cantidad;
    total += subtotal;

    const div = document.createElement('div');
    div.className = 'carrito-item';
    div.innerHTML = `
      <img src="${item.imagen_url || 'img/ferromarket.png'}" alt="${item.nombre}" class="carrito-item-img">
      <div class="carrito-item-info">
        <p class="carrito-item-nombre">${item.nombre}</p>
        <p class="carrito-item-precio">$${item.precio ? item.precio.toLocaleString('es-CL') : '0'}</p>
        <div class="carrito-item-cantidad">
          <button class="carrito-btn-cantidad" onclick="cambiarCantidadCarrito(${idx}, -1)">-</button>
          <span>${item.cantidad}</span>
          <button class="carrito-btn-cantidad" onclick="cambiarCantidadCarrito(${idx}, 1)">+</button>
        </div>
      </div>
      <button class="carrito-btn-eliminar" onclick="eliminarDelCarrito(${idx})"><i class="fa fa-trash"></i></button>
    `;
    contenedor.appendChild(div);
  });

  if (totalEl) totalEl.textContent = `$${total.toLocaleString('es-CL')}`;
}

function cambiarCantidadCarrito(idx, delta) {
  const carrito = obtenerCarrito();
  if (!carrito[idx]) return;
  carrito[idx].cantidad += delta;
  if (carrito[idx].cantidad <= 0) carrito.splice(idx, 1);
  guardarCarrito(carrito);
  renderizarCarrito();
  actualizarBadgeCarrito();
}

function eliminarDelCarrito(idx) {
  const carrito = obtenerCarrito();
  carrito.splice(idx, 1);
  guardarCarrito(carrito);
  renderizarCarrito();
  actualizarBadgeCarrito();
}

function actualizarBadgeCarrito() {
  const badge = document.getElementById('carrito-badge');
  if (!badge) return;
  const carrito = obtenerCarrito();
  const total = carrito.reduce((acc, item) => acc + item.cantidad, 0);
  badge.textContent = total;
  badge.style.display = total > 0 ? 'inline-flex' : 'none';
}

function abrirCarrito() {
  const drawer = document.getElementById('carrito-drawer');
  const overlay = document.getElementById('carrito-overlay');
  if (drawer) drawer.classList.add('abierto');
  if (overlay) overlay.classList.add('activo');
}

function cerrarCarrito() {
  const drawer = document.getElementById('carrito-drawer');
  const overlay = document.getElementById('carrito-overlay');
  if (drawer) drawer.classList.remove('abierto');
  if (overlay) overlay.classList.remove('activo');
}

function inicializarCarrito() {
  const btnCarrito = document.getElementById('btn-carrito');
  if (btnCarrito) btnCarrito.onclick = abrirCarrito;

  const btnCerrarCarrito = document.getElementById('cerrar-carrito');
  if (btnCerrarCarrito) btnCerrarCarrito.onclick = cerrarCarrito;

  const overlay = document.getElementById('carrito-overlay');
  if (overlay) overlay.onclick = cerrarCarrito;

  const btnFinalizar = document.getElementById('btn-finalizar-compra');
  if (btnFinalizar) {
    btnFinalizar.onclick = async function() {
      const carrito = obtenerCarrito();
      if (carrito.length === 0) {
        alert('Tu carrito está vacío. Agrega productos antes de finalizar la compra.');
        return;
      }

      // Verificar si el usuario está logueado
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        cerrarCarrito();
        mostrarModalLogin();
        return;
      }

      // Generar código de orden
      const codigoOrden = 'FM-' + Math.floor(1000 + Math.random() * 9000);
      const totalCompra = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

      // Limpiar carrito
      guardarCarrito([]);
      renderizarCarrito();
      actualizarBadgeCarrito();
      cerrarCarrito();

      alert(`✅ ¡Compra realizada con éxito!\n\nCódigo de orden: ${codigoOrden}\nTotal: $${totalCompra.toLocaleString('es-CL')}\n\nGracias por comprar en Ferromarket.`);
    };
  }

  // Cargar estado inicial del carrito
  renderizarCarrito();
  actualizarBadgeCarrito();
}