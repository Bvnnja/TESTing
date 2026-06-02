// js/index.js
// La configuración de Supabase se carga ahora desde supabase-config.js

let cacheCalificaciones = [];

async function cargarProductos() {
  const { data, error } = await supabaseClient
    .from('productos')
    .select('*');
  if (error) return;
  
  // Cargar promedios de calificaciones
  const { data: califData, error: califErr } = await supabaseClient
    .from('calificaciones')
    .select('producto_id, puntuacion');
  
  if (!califErr) {
    cacheCalificaciones = califData || [];
  } else {
    console.warn('La tabla de calificaciones no existe o hubo un error.', califErr.message);
  }

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
      
      const contenedorEstrellas = card.querySelector('.tarjeta-producto-calificacion');
      if (contenedorEstrellas) {
        const califsProducto = cacheCalificaciones.filter(c => c.producto_id === producto.id);
        if (califsProducto.length > 0) {
          const suma = califsProducto.reduce((acc, c) => acc + c.puntuacion, 0);
          const promedio = Math.round((suma / califsProducto.length) * 10) / 10;
          contenedorEstrellas.innerHTML = `<i class="fa fa-star"></i> ${promedio} (${califsProducto.length})`;
        } else {
          contenedorEstrellas.innerHTML = `<i class="fa fa-star-o" style="color:#ccc;"></i> Sin calificar`;
        }
      }

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
  const modalDescCorta = clone.querySelector('.modal-descripcion-corta');
  const btnVerMas = clone.querySelector('.modal-ver-mas');
  
  if (producto.descripcion && producto.descripcion.length > 60) {
    const descCorta = producto.descripcion.slice(0, 60) + '...';
    modalDescCorta.textContent = descCorta;
    
    let mostrandoCompleta = false;
    btnVerMas.onclick = function() {
      if (!mostrandoCompleta) {
        modalDescCorta.textContent = producto.descripcion;
        btnVerMas.textContent = 'Ver menos';
        mostrandoCompleta = true;
      } else {
        modalDescCorta.textContent = descCorta;
        btnVerMas.textContent = 'Ver descripción completa';
        mostrandoCompleta = false;
      }
    };
  } else {
    modalDescCorta.textContent = producto.descripcion || '';
    btnVerMas.style.display = 'none';
  }
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
  clone.querySelector('.modal-agregar-carrito').onclick = async function() {
    const btn = this;
    const cant = parseInt(inputCantidad.value) || 1;
    const originalText = btn.innerHTML;
    // Estado de carga en el botón
    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Agregando...';
    
    const resultado = await agregarAlCarrito(producto, cant);
    
    if (resultado === true) {
      modal.style.display = 'none';
      modalContainer.innerHTML = '';
    } else if (resultado === 'login') {
      // El modal de login ya reemplazó al modal de producto en el DOM.
      // No hacemos nada para evitar borrar el modal de login.
    } else {
      // En caso de otro error, restauramos el botón
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  };
  // Botón calificar (solo visual -> ahora real)
  const btnCalificar = clone.querySelector('.modal-calificar');
  if (btnCalificar) {
    btnCalificar.onclick = async function() {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        mostrarModalLogin();
        return;
      }
      mostrarModalCalificacion(producto.id, clone);
    };
  }
  
  // Cargar comentarios
  cargarComentariosProducto(producto.id, clone);

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

async function cargarComentariosProducto(productoId, cloneRef) {
    const wrapper = cloneRef.querySelector('.lista-comentarios-wrapper');
    const track = cloneRef.querySelector('.lista-comentarios-track');
    const spanPromedio = cloneRef.querySelector('.promedio-estrellas');
    
    if (!track) return;
    track.innerHTML = '<div style="text-align:center; padding:10px;"><i class="fa fa-spinner fa-spin"></i> Cargando opiniones...</div>';
    
    // Para evitar errores si la tabla profiles no existe o no tiene FK, quitamos el join de profiles por ahora
    const { data, error } = await supabaseClient
        .from('calificaciones')
        .select(`id, puntuacion, comentario, created_at, usuario_id`)
        .eq('producto_id', productoId)
        .order('created_at', { ascending: false });
        
    if (error) {
        console.error('Error al cargar comentarios:', error);
        track.innerHTML = '<div style="text-align:center; padding:10px; color:red;">Error al cargar opiniones.</div>';
        return;
    }

    if (!data || data.length === 0) {
        track.innerHTML = '<div style="text-align:center; padding:10px; color:#777;">Aún no hay opiniones. ¡Sé el primero!</div>';
        if (spanPromedio) spanPromedio.textContent = '0.0';
        return;
    }
    
    const suma = data.reduce((acc, c) => acc + c.puntuacion, 0);
    const promedio = Math.round((suma / data.length) * 10) / 10;
    if (spanPromedio) spanPromedio.textContent = promedio;
    
    // Obtener nombres desde la tabla profiles de forma manual para evitar error de FK
    const usuarioIds = [...new Set(data.map(c => c.usuario_id))];
    let mapPerfiles = {};
    if (usuarioIds.length > 0) {
        const { data: perfilesData, error: perfilesErr } = await supabaseClient
            .from('profiles')
            .select('id, full_name')
            .in('id', usuarioIds);
            
        if (!perfilesErr && perfilesData) {
            perfilesData.forEach(p => {
                mapPerfiles[p.id] = p.full_name;
            });
        }
    }
    
    track.innerHTML = '';
    data.forEach(c => {
        const item = document.createElement('div');
        item.className = 'comentario-item';
        item.style.marginBottom = '0'; // Se usa gap en el track
        
        let estrellasHtml = '';
        for(let i=1; i<=5; i++) {
            estrellasHtml += i <= c.puntuacion ? '<i class="fa fa-star"></i>' : '<i class="fa fa-star-o"></i>';
        }
        
        let fecha = 'N/A';
        try {
           fecha = new Date(c.created_at).toLocaleDateString('es-CL');
        } catch {}
        
        let nombre = mapPerfiles[c.usuario_id] || 'Usuario de Ferromarket';
        
        item.innerHTML = `
            <div class="comentario-header">
                <span class="comentario-usuario"><i class="fa fa-user-circle-o"></i> ${nombre}</span>
                <span class="comentario-fecha">${fecha}</span>
            </div>
            <div class="comentario-estrellas">${estrellasHtml}</div>
            ${c.comentario ? '<p class="comentario-texto">'+c.comentario+'</p>' : ''}
        `;
        track.appendChild(item);
    });

    // Iniciar Animación de Carrusel si hay más de 1 opinión
    if (data.length > 1) {
        // Clonar el primer elemento para el efecto de bucle infinito
        const primerComentario = track.firstElementChild.cloneNode(true);
        track.appendChild(primerComentario);

        let indiceActual = 0;
        const totalItems = data.length; // sin contar el clon
        
        if (wrapper.carouselInterval) clearInterval(wrapper.carouselInterval);
        
        wrapper.carouselInterval = setInterval(() => {
            if (!document.body.contains(wrapper)) {
                clearInterval(wrapper.carouselInterval);
                return;
            }
            
            indiceActual++;
            track.style.transition = 'transform 0.6s ease-in-out';
            
            const items = track.children;
            if (items[indiceActual]) {
                 const offset = items[indiceActual].offsetTop - items[0].offsetTop; 
                 track.style.transform = `translateY(-${offset}px)`;
            }
            
            if (indiceActual === totalItems) {
                setTimeout(() => {
                    if(!document.body.contains(wrapper)) return;
                    track.style.transition = 'none';
                    track.style.transform = `translateY(0px)`;
                    indiceActual = 0;
                }, 600); // Esperar que termine la transición
            }
        }, 3500); // Cambiar cada 3.5 segundos
    }
}

function mostrarModalCalificacion(productoId, productoModalRef) {
    const template = document.getElementById('plantilla-modal-calificacion');
    if (!template) return;
    
    const clone = template.content.cloneNode(true);
    const modal = clone.querySelector('.modal');
    
    // Logica de estrellitas interactivas
    const estrellas = clone.querySelectorAll('.estrella-btn');
    const inputValor = clone.querySelector('#calificacion-valor');
    
    estrellas.forEach(estrella => {
        estrella.addEventListener('mouseover', function() {
            const val = parseInt(this.getAttribute('data-val'));
            estrellas.forEach(e => {
                if(parseInt(e.getAttribute('data-val')) <= val) e.classList.add('hover');
                else e.classList.remove('hover');
            });
        });
        estrella.addEventListener('mouseout', function() {
            estrellas.forEach(e => e.classList.remove('hover'));
        });
        estrella.addEventListener('click', function() {
            const val = parseInt(this.getAttribute('data-val'));
            inputValor.value = val;
            estrellas.forEach(e => {
                if(parseInt(e.getAttribute('data-val')) <= val) e.classList.add('activa');
                else e.classList.remove('activa');
            });
        });
    });
    
    // Logica de guardado
    const form = clone.querySelector('#formulario-calificacion');
    form.onsubmit = async function(e) {
        e.preventDefault();
        const puntuacion = parseInt(inputValor.value);
        if (puntuacion === 0) {
            window.mostrarToast('Por favor, selecciona al menos una estrella.', 'error');
            return;
        }
        const comentario = form.querySelector('#calificacion-comentario').value;
        const btnGuardar = form.querySelector('#btn-guardar-calificacion');
        const originalText = btnGuardar.textContent;
        btnGuardar.textContent = 'Enviando...';
        btnGuardar.disabled = true;
        
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return;
        
        try {
            // Upsert / Update or Insert
            const { data: existente } = await supabaseClient
                .from('calificaciones')
                .select('id')
                .eq('producto_id', productoId)
                .eq('usuario_id', session.user.id)
                .maybeSingle();
                
            let errorOp = null;
            if (existente) {
                const { error } = await supabaseClient
                    .from('calificaciones')
                    .update({ puntuacion, comentario })
                    .eq('id', existente.id);
                errorOp = error;
            } else {
                const { error } = await supabaseClient
                    .from('calificaciones')
                    .insert([{
                        producto_id: productoId,
                        usuario_id: session.user.id,
                        puntuacion,
                        comentario
                    }]);
                errorOp = error;
            }
            
            if (errorOp) {
                console.error(errorOp);
                window.mostrarToast('Error al guardar calificación: ' + errorOp.message, 'error');
                return;
            } else {
                window.mostrarToast('¡Calificación enviada!', 'exito');
                modal.remove();
                
                // Recargar productos (actualiza las tarjetas)
                cargarProductos();
                
                // Recargar modal actual
                cargarComentariosProducto(productoId, document.querySelector('.modal-producto-avanzado'));
            }
        } catch (err) {
            console.error(err);
            window.mostrarToast('Error inesperado: ' + err.message, 'error');
        } finally {
            btnGuardar.textContent = originalText;
            btnGuardar.disabled = false;
        }
    };
    
    // Mostrar modal (como overlay encima)
    modal.style.display = 'block';
    modal.style.zIndex = '9999';
    
    // Cerrar modal al hacer click en la X
    clone.querySelector('.cerrar-modal').onclick = function() {
        modal.remove();
    };
    
    // Cerrar modal al hacer click fuera
    window.addEventListener('click', function(event) {
        if (event.target == modal) {
            modal.remove();
        }
    });
    
    document.body.appendChild(clone);
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
          window.location.href = 'pages/gestion-productos.html';
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
          window.location.href = 'pages/gestion-usuarios.html';
        };

        // Crear opción Gestionar Pedidos
        const optPedidos = document.createElement('a');
        optPedidos.href = '#';
        optPedidos.className = 'opcion-menu-usuario opcion-admin-dinamica';
        optPedidos.innerHTML = '<i class="fa fa-truck"></i> Gestionar Pedidos';
        optPedidos.onclick = function(e) {
          e.preventDefault();
          e.stopPropagation();
          menu.classList.remove('mostrar');
          window.location.href = 'pages/gestion-pedidos.html';
        };

        menu.insertBefore(optProductos, divisor);
        menu.insertBefore(optUsuarios, divisor);
        menu.insertBefore(optPedidos, divisor);
      }
    }

    // Configurar clic de "Cerrar sesión" en el menú desplegable
    const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
    if (btnCerrarSesion) {
      btnCerrarSesion.onclick = async function(e) {
        e.preventDefault();
        window.mostrarConfirmacion('¿Estás seguro de que deseas cerrar sesión?', async () => {
          const { error } = await supabaseClient.auth.signOut();
          if (error) {
            window.mostrarToast('Error al cerrar sesión: ' + error.message, 'error');
          } else {
            window.mostrarToast('Sesión cerrada correctamente.', 'exito');
            setTimeout(() => {
                window.location.href = window.location.pathname;
            }, 1000);
          }
        });
      };
    }

    // Configurar clics para las opciones que aún no están implementadas (href="#")
    const opcionesGenericas = menu ? menu.querySelectorAll('.opcion-menu-usuario:not(.cerrar-sesion):not(.opcion-admin-dinamica)') : [];
    opcionesGenericas.forEach(opcion => {
      if (opcion.getAttribute('href') === '#') {
        opcion.onclick = function(e) {
          e.preventDefault();
          e.stopPropagation();
          window.mostrarToast(`Opción "${opcion.textContent.trim()}" en desarrollo.`, 'info');
        };
      } else {
        opcion.onclick = null; // Dejar que el enlace (href) funcione normalmente
      }
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
          window.mostrarToast('Error al iniciar sesión: ' + error.message, 'error');
        } else {
          window.mostrarToast('¡Sesión iniciada con éxito!', 'exito');
          modal.style.display = 'none';
          setTimeout(() => { modalContainer.innerHTML = ''; }, 300);
        }
      } catch (err) {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        window.mostrarToast('Ocurrió un error inesperado: ' + err.message, 'error');
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
          window.mostrarToast('Error al iniciar sesión con Google: ' + error.message, 'error');
        }
      } catch (err) {
        window.mostrarToast('Ocurrió un error inesperado: ' + err.message, 'error');
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

async function sincronizarCarritoLocalConSupabase(session) {
  if (!session) return;
  const localStr = localStorage.getItem('ferromarket_carrito');
  if (!localStr) return;
  
  const local = JSON.parse(localStr);
  if (local.length === 0) return;
  
  mostrarToast('Sincronizando tu carrito...', 'info');
  
  for (const item of local) {
    const { data: existente } = await supabaseClient
      .from('carrito')
      .select('*')
      .eq('usuario_id', session.user.id)
      .eq('producto_id', item.producto_id)
      .maybeSingle();
      
    if (existente) {
      await supabaseClient
        .from('carrito')
        .update({ cantidad: existente.cantidad + item.cantidad, updated_at: new Date().toISOString() })
        .eq('id', existente.id);
    } else {
      await supabaseClient
        .from('carrito')
        .insert([{
          usuario_id: session.user.id,
          producto_id: item.producto_id,
          nombre_producto: item.nombre_producto,
          precio_unitario: item.precio_unitario,
          imagen_url: item.imagen_url,
          cantidad: item.cantidad
        }]);
    }
  }
  
  localStorage.removeItem('ferromarket_carrito');
  await renderizarCarrito();
  await actualizarBadgeCarrito();
}

function inicializarLogin() {
  // Escuchar cambios de estado de autenticación de Supabase (y setea el estado inicial)
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    window.currentUser = session ? session.user : null;
    actualizarInterfazUsuario(window.currentUser);
    
    if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
       await sincronizarCarritoLocalConSupabase(session);
    }
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

  // Verificar si venimos con un producto específico
  const productoIdParam = urlParams.get('productoId');
  if (productoIdParam) {
    setTimeout(async () => {
      const { data: prod, error } = await supabaseClient.from('productos').select('*').eq('id', productoIdParam).single();
      if (!error && prod) {
        mostrarModal(prod);
      }
    }, 500); // Dar un poco de tiempo para que carguen los otros componentes visuales
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  cargarProductos();
  inicializarHamburguesa();
  inicializarLogin();
  await inicializarCarrito();
});

// --- FUNCIONES DE ADMINISTRACIÓN ---
function esUsuarioAdmin(user) {
  if (!user) return false;
  return user.email === 'admin@ferromarket.cl' || user.user_metadata?.role === 'admin';
}

// ============================================================
// --- SISTEMA DE NOTIFICACIONES TOAST ---
// ============================================================
function mostrarToast(mensaje, tipo = 'exito') {
  let contenedor = document.getElementById('toast-contenedor');
  if (!contenedor) {
    contenedor = document.createElement('div');
    contenedor.id = 'toast-contenedor';
    contenedor.style.cssText = 'position:fixed; bottom:24px; left:50%; transform:translateX(-50%); z-index:9999; display:flex; flex-direction:column; gap:10px; align-items:center; pointer-events:none;';
    document.body.appendChild(contenedor);
  }
  const colores = {
    exito:   { bg: '#1fb546', icon: 'fa-check-circle' },
    error:   { bg: '#dc3545', icon: 'fa-times-circle' },
    info:    { bg: '#0d6efd', icon: 'fa-info-circle' },
    cargando:{ bg: '#555',    icon: 'fa-spinner fa-spin' }
  };
  const c = colores[tipo] || colores.info;
  const toast = document.createElement('div');
  toast.style.cssText = `background:${c.bg}; color:#fff; padding:12px 22px; border-radius:50px; border:2px solid #000; box-shadow:4px 4px 0px #000; font-family:'Outfit',sans-serif; font-weight:700; font-size:0.95rem; display:flex; align-items:center; gap:10px; pointer-events:auto; animation:slideUp 0.3s ease forwards;`;
  toast.innerHTML = `<i class="fa ${c.icon}"></i> ${mensaje}`;
  contenedor.appendChild(toast);
  if (tipo !== 'cargando') {
    setTimeout(() => toast.remove(), 3500);
  }
  return toast;
}

// ============================================================
// --- CARRITO DE COMPRAS (Supabase) ---
// ============================================================

// Obtener todos los items del carrito del usuario actual desde Supabase o LocalStorage
async function obtenerCarrito() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    const local = localStorage.getItem('ferromarket_carrito');
    return local ? JSON.parse(local) : [];
  }

  const { data, error } = await supabaseClient
    .from('carrito')
    .select('*')
    .eq('usuario_id', session.user.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Carrito] Error al obtener:', error);
    mostrarToast('Error al cargar el carrito: ' + error.message, 'error');
    return [];
  }
  return data || [];
}

// Agregar o actualizar producto en el carrito (requiere sesión activa o guarda local)
async function agregarAlCarrito(producto, cantidad) {
  // 1. Verificar sesión
  const { data: { session } } = await supabaseClient.auth.getSession();
  const toastCargando = mostrarToast('Agregando al carrito...', 'cargando');

  if (!session) {
    let local = localStorage.getItem('ferromarket_carrito');
    local = local ? JSON.parse(local) : [];
    
    const existente = local.find(item => item.producto_id === producto.id);
    if (existente) {
      existente.cantidad += cantidad;
    } else {
      local.push({
        producto_id: producto.id,
        nombre_producto: producto.nombre,
        precio_unitario: producto.precio,
        imagen_url: producto.imagen_url,
        cantidad: cantidad
      });
    }
    localStorage.setItem('ferromarket_carrito', JSON.stringify(local));
    
    toastCargando.remove();
    mostrarToast(`"${producto.nombre}" agregado al carrito`, 'exito');
    await renderizarCarrito();
    await actualizarBadgeCarrito();
    abrirCarrito();
    return true;
  }

  try {
    // 2. Verificar si ya existe en el carrito
    const { data: existente, error: selectError } = await supabaseClient
      .from('carrito')
      .select('*')
      .eq('usuario_id', session.user.id)
      .eq('producto_id', producto.id)
      .maybeSingle();

    if (selectError) {
      toastCargando.remove();
      console.error('[Carrito] Error SELECT:', selectError);
      mostrarToast('Error al consultar carrito: ' + selectError.message, 'error');
      return false;
    }

    if (existente) {
      // Actualizar cantidad
      const { error: updateError } = await supabaseClient
        .from('carrito')
        .update({
          cantidad: existente.cantidad + cantidad,
          updated_at: new Date().toISOString()
        })
        .eq('id', existente.id);

      if (updateError) {
        toastCargando.remove();
        console.error('[Carrito] Error UPDATE:', updateError);
        mostrarToast('Error al actualizar carrito: ' + updateError.message, 'error');
        return false;
      }
    } else {
      // Insertar nuevo ítem
      const { error: insertError } = await supabaseClient
        .from('carrito')
        .insert([{
          usuario_id: session.user.id,
          producto_id: producto.id,
          nombre_producto: producto.nombre,
          precio_unitario: producto.precio,
          imagen_url: producto.imagen_url,
          cantidad: cantidad
        }]);

      if (insertError) {
        toastCargando.remove();
        console.error('[Carrito] Error INSERT:', insertError);
        mostrarToast('Error al agregar: ' + insertError.message, 'error');
        return false;
      }
    }

    toastCargando.remove();
    mostrarToast(`"${producto.nombre}" agregado al carrito`, 'exito');
    await renderizarCarrito();
    await actualizarBadgeCarrito();
    abrirCarrito();
    return true;

  } catch (err) {
    toastCargando.remove();
    console.error('[Carrito] Error inesperado:', err);
    mostrarToast('Error inesperado: ' + err.message, 'error');
    return false;
  }
}

// Renderizar el drawer del carrito con datos de Supabase
async function renderizarCarrito() {
  const contenedor = document.getElementById('carrito-drawer-productos');
  const totalEl = document.getElementById('carrito-total-monto');
  if (!contenedor) return;

  // Estado de carga
  contenedor.innerHTML = '<div style="text-align:center; padding: 40px 20px; color:#999;"><i class="fa fa-spinner fa-spin" style="font-size:2rem; display:block; margin-bottom:12px;"></i>Cargando...</div>';

  const carrito = await obtenerCarrito();
  contenedor.innerHTML = '';

  if (carrito.length === 0) {
    contenedor.innerHTML = '<div style="text-align:center; padding: 40px 20px; color:#999; font-size:1rem;"><i class="fa fa-shopping-cart" style="font-size:2.5rem; margin-bottom:12px; display:block;"></i>Tu carrito está vacío</div>';
    if (totalEl) totalEl.textContent = '$0';
    return;
  }

  let total = 0;
  carrito.forEach((item) => {
    const subtotal = item.precio_unitario * item.cantidad;
    total += subtotal;

    const div = document.createElement('div');
    div.className = 'carrito-item';
    div.id = `carrito-item-${item.producto_id}`;
    div.innerHTML = `
      <img src="${item.imagen_url || 'assets/img/ui/ferromarket.png'}" alt="${item.nombre_producto}" class="carrito-item-img">
      <div class="carrito-item-info">
        <p class="carrito-item-nombre">${item.nombre_producto}</p>
        <p class="carrito-item-precio">$${item.precio_unitario ? item.precio_unitario.toLocaleString('es-CL') : '0'}</p>
        <div class="carrito-item-cantidad">
          <button class="carrito-btn-cantidad" onclick="cambiarCantidadCarrito(${item.producto_id}, -1)">-</button>
          <span id="cant-${item.producto_id}">${item.cantidad}</span>
          <button class="carrito-btn-cantidad" onclick="cambiarCantidadCarrito(${item.producto_id}, 1)">+</button>
        </div>
      </div>
      <button class="carrito-btn-eliminar" onclick="eliminarDelCarrito(${item.producto_id})"><i class="fa fa-trash"></i></button>
    `;
    contenedor.appendChild(div);
  });

  if (totalEl) totalEl.textContent = `$${total.toLocaleString('es-CL')}`;
}

// Cambiar cantidad de un producto (+1 / -1); elimina si llega a 0
async function cambiarCantidadCarrito(productoId, delta) {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    let local = localStorage.getItem('ferromarket_carrito');
    local = local ? JSON.parse(local) : [];
    const existente = local.find(item => item.producto_id === productoId);
    if (existente) {
      existente.cantidad += delta;
      if (existente.cantidad <= 0) {
        local = local.filter(item => item.producto_id !== productoId);
      }
      localStorage.setItem('ferromarket_carrito', JSON.stringify(local));
      await renderizarCarrito();
      await actualizarBadgeCarrito();
    }
    return;
  }

  const { data: item } = await supabaseClient
    .from('carrito')
    .select('*')
    .eq('usuario_id', session.user.id)
    .eq('producto_id', productoId)
    .maybeSingle();

  if (!item) return;

  const nuevaCantidad = item.cantidad + delta;

  if (nuevaCantidad <= 0) {
    await supabaseClient
      .from('carrito')
      .delete()
      .eq('id', item.id);
  } else {
    await supabaseClient
      .from('carrito')
      .update({ cantidad: nuevaCantidad, updated_at: new Date().toISOString() })
      .eq('id', item.id);
  }

  await renderizarCarrito();
  await actualizarBadgeCarrito();
}

// Eliminar un producto del carrito
async function eliminarDelCarrito(productoId) {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    let local = localStorage.getItem('ferromarket_carrito');
    local = local ? JSON.parse(local) : [];
    local = local.filter(item => item.producto_id !== productoId);
    localStorage.setItem('ferromarket_carrito', JSON.stringify(local));
    await renderizarCarrito();
    await actualizarBadgeCarrito();
    return;
  }

  await supabaseClient
    .from('carrito')
    .delete()
    .eq('usuario_id', session.user.id)
    .eq('producto_id', productoId);

  await renderizarCarrito();
  await actualizarBadgeCarrito();
}

// Actualizar el badge con el total de unidades en el carrito
async function actualizarBadgeCarrito() {
  const badge = document.getElementById('carrito-badge');
  if (!badge) return;

  const carrito = await obtenerCarrito();
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

async function inicializarCarrito() {
  const btnCarrito = document.getElementById('btn-carrito');
  if (btnCarrito) {
    btnCarrito.onclick = async function() {
      abrirCarrito();
      await renderizarCarrito();
    };
  }

  const btnCerrarCarrito = document.getElementById('cerrar-carrito');
  if (btnCerrarCarrito) btnCerrarCarrito.onclick = cerrarCarrito;

  const overlay = document.getElementById('carrito-overlay');
  if (overlay) overlay.onclick = cerrarCarrito;

  const btnFinalizar = document.getElementById('btn-finalizar-compra');
  if (btnFinalizar) {
    btnFinalizar.onclick = async function() {
      const carrito = await obtenerCarrito();
      if (carrito.length === 0) {
        window.mostrarToast('Tu carrito está vacío. Agrega productos antes de finalizar la compra.', 'error');
        return;
      }

      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        cerrarCarrito();
        mostrarModalLogin();
        return;
      }

      // El carrito ya está en Supabase — checkout.html lo leerá directo
      cerrarCarrito();
      window.location.href = 'pages/checkout.html';
    };
  }

  // Carga inicial: renderizar carrito y badge
  await renderizarCarrito();
  await actualizarBadgeCarrito();
}
