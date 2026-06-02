const MAPA_CATEGORIAS = {
    "1": "Abrasivos",
    "2": "Bloques y Soleras",
    "3": "Pinturas y accesorios",
    "4": "Tornillos y fijaciones",
    "5": "Pernos, Tuercas y fijaciones",
    "6": "Adhesivos y selladores",
    "7": "Aislación",
    "8": "Alambre,Cerco y Mallas",
    "9": "Cañeria de Cobre",
    "10": "Cañeria PPR",
    "11": "Cemento y Adhesivos",
    "12": "Electricidad",
    "13": "Estanque y Fosas Sépticas",
    "14": "Fierro, Hierro, Mallas",
    "15": "Herramientas Manuales",
    "16": "Laminas PVC",
    "17": "Maderas",
    "18": "Metalcon",
    "19": "Planchas y Revestimiento",
    "20": "Policarbonato y Accesorios",
    "21": "Puertas",
    "22": "Techos y aislantes",
    "23": "Tuberías PVC"
};

let productosList = [];
function esUsuarioAdmin(user) {
    if (!user) return false;
    return user.email === 'admin@ferromarket.cl' || user.user_metadata?.role === 'admin';
}
function obtenerFilePathDesdeUrl(url) {
    if (!url) return null;
    if (url.includes('/storage/v1/object/public/')) {
        const parts = url.split('/storage/v1/object/public/');
        if (parts.length > 1) {
            const subparts = parts[1].split('/');
            if (subparts.length > 1) {
                return decodeURIComponent(subparts.slice(1).join('/'));
            }
        }
    }
    return null;
}
async function verificarAcceso() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session || !esUsuarioAdmin(session.user)) {
            window.mostrarToast('Acceso denegado. Se requieren credenciales de administrador.', 'error');
            setTimeout(() => { window.location.href = '../index.html'; }, 1500);
            return;
        }

        // Mostrar panel y ocultar loader
        document.getElementById('loader-pantalla').style.display = 'none';
        document.getElementById('contenido-gestion-dashboard').style.display = 'block';

        // Inicializar buscador
        const inputBuscador = document.getElementById('buscador-productos');
        if (inputBuscador) {
            inputBuscador.addEventListener('input', (e) => {
                const termino = e.target.value.toLowerCase();
                const listaFiltrada = productosList.filter(p => {
                    const nombre = (p.nombre || '').toLowerCase();
                    const desc = (p.descripcion || '').toLowerCase();
                    return nombre.includes(termino) || desc.includes(termino);
                });
                renderizarTablaProductos(listaFiltrada);
            });
        }

        // Inicializar datos
        cargarProductosTable();

        // Configurar botón agregar
        document.getElementById('btn-agregar-producto-dashboard').onclick = function () {
            abrirModalForm(null);
        };
    } catch (err) {
        window.mostrarToast('Error al verificar sesión: ' + err.message, 'error');
        window.location.href = '../index.html';
    }
}
async function cargarProductosTable() {
    const tbody = document.getElementById('tabla-productos-body');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;"><i class="fa fa-spinner fa-spin"></i> Cargando productos...</td></tr>';

    const { data, error } = await supabaseClient.from('productos').select('*');
    if (error) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Error al cargar productos: ${error.message}</td></tr>`;
        return;
    }

    productosList = data || [];
    renderizarTablaProductos(productosList);
}

function renderizarTablaProductos(listaParaMostrar) {
    const tbody = document.getElementById('tabla-productos-body');
    tbody.innerHTML = '';

    if (listaParaMostrar.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No se encontraron productos.</td></tr>';
        return;
    }

    listaParaMostrar.forEach((prod) => {
        const indexOriginal = productosList.indexOf(prod);
        const tr = document.createElement('tr');

        const descripcionCorta = prod.descripcion && prod.descripcion.length > 50
            ? prod.descripcion.slice(0, 50) + '...'
            : (prod.descripcion || '');

        tr.innerHTML = `
                    <td><img src="${prod.imagen_url || '../assets/img/ui/ferromarket.png'}" alt="${prod.nombre}" class="tabla-img-thumb"></td>
                    <td style="font-weight: bold;">${prod.nombre}</td>
                    <td style="color: #666; max-width: 250px;">${descripcionCorta}</td>
                    <td style="font-weight: bold; color: var(--color-principal);">$${prod.precio ? prod.precio.toLocaleString('es-CL') : '0'}</td>
                    <td>${prod.cantidad || '0'}</td>
                    <td><span class="badge-categoria-gestion">${MAPA_CATEGORIAS[prod.categoria] || 'Desconocido'}</span></td>
                    <td>
                        <div class="tabla-acciones">
                            <button class="btn-tabla-editar" onclick="editarProducto(${indexOriginal})"><i class="fa fa-pencil"></i></button>
                            <button class="btn-tabla-eliminar" onclick="eliminarProducto(${indexOriginal})"><i class="fa fa-trash"></i></button>
                        </div>
                    </td>
                `;
        tbody.appendChild(tr);
    });
}
function abrirModalForm(producto) {
    const modalContainer = document.getElementById('modal-container-dashboard');
    modalContainer.innerHTML = '';
    const template = document.getElementById('plantilla-modal-gestion-producto');
    if (!template) return;
    const clone = template.content.cloneNode(true);
    const modal = clone.querySelector('.modal');

    const titulo = clone.querySelector('#titulo-gestion-producto');
    const form = clone.querySelector('#formulario-gestion-producto');

    const inputId = clone.querySelector('#gestion-id');
    const inputNombre = clone.querySelector('#gestion-nombre');
    const inputDescripcion = clone.querySelector('#gestion-descripcion');
    const inputPrecio = clone.querySelector('#gestion-precio');
    const inputCantidad = clone.querySelector('#gestion-cantidad');
    const inputCategoria = clone.querySelector('#gestion-categoria');
    const inputImagenFile = clone.querySelector('#gestion-imagen-file');
    const previewContenedor = clone.querySelector('#preview-imagen-contenedor');
    const previewImg = clone.querySelector('#preview-imagen-img');

    // Vista previa al seleccionar imagen
    inputImagenFile.onchange = function () {
        const file = inputImagenFile.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                previewImg.src = e.target.result;
                previewContenedor.style.display = 'block';
            }
            reader.readAsDataURL(file);
        } else {
            if (producto) {
                previewImg.src = producto.imagen_url || '';
                previewContenedor.style.display = producto.imagen_url ? 'block' : 'none';
            } else {
                previewContenedor.style.display = 'none';
                previewImg.src = '';
            }
        }
    };

    if (producto) {
        // Modo Edición
        titulo.innerHTML = '<i class="fa fa-pencil-square-o"></i> Editar Producto';
        inputId.value = producto.id;
        inputNombre.value = producto.nombre || '';
        inputDescripcion.value = producto.descripcion || '';
        inputPrecio.value = producto.precio || 0;
        inputCantidad.value = producto.cantidad || 0;
        inputCategoria.value = producto.categoria || '1';
        inputImagenFile.required = false; // Opcional en edición
        if (producto.imagen_url) {
            previewImg.src = producto.imagen_url;
            previewContenedor.style.display = 'block';
        }
    } else {
        // Modo Creación
        titulo.innerHTML = '<i class="fa fa-plus-circle"></i> Agregar Producto';
        inputId.value = '';
        inputNombre.value = '';
        inputDescripcion.value = '';
        inputPrecio.value = '';
        inputCantidad.value = '';
        inputCategoria.value = '1';
        inputImagenFile.required = true; // Requerido al crear
        previewContenedor.style.display = 'none';
        previewImg.src = '';
    }

    form.onsubmit = async function (e) {
        e.preventDefault();
        const id = inputId.value;

        const submitBtn = form.querySelector('#btn-guardar-producto');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Guardando...';
        submitBtn.disabled = true;

        let finalImageUrl = producto ? producto.imagen_url : '';
        let successfulBucket = null;
        const file = inputImagenFile.files[0];

        try {
            // Si se seleccionó un archivo nuevo, subirlo a Supabase Storage
            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
                const filePath = `${fileName}`;

                let uploadData = null;
                let uploadError = null;
                const candidateBuckets = ['imagenes', 'IMAGENES', 'Imagenes'];

                for (const bucketName of candidateBuckets) {
                    const { data, error } = await supabaseClient
                        .storage
                        .from(bucketName)
                        .upload(filePath, file);

                    if (!error) {
                        uploadData = data;
                        successfulBucket = bucketName;
                        break;
                    } else if (error.message !== 'Bucket not found') {
                        // Si es un error de permisos u otro tipo de error, detenemos el loop y reportamos
                        uploadError = error;
                        successfulBucket = bucketName;
                        break;
                    } else {
                        // Guardamos el error de "Bucket not found" y probamos con el siguiente
                        uploadError = error;
                    }
                }

                if (uploadError && !successfulBucket) {
                    window.mostrarToast('Error al subir la imagen a Supabase Storage: ' + uploadError.message + '\nVerifica las políticas RLS del bucket de storage.', 'error');
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                    return;
                }

                if (uploadError && successfulBucket) {
                    window.mostrarToast('Error de permisos al subir la imagen al bucket "' + successfulBucket + '": ' + uploadError.message + '\nAsegúrate de tener políticas RLS INSERT permitidas.', 'error');
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                    return;
                }

                // Obtener la URL pública de la imagen subida usando el bucket que funcionó
                const { data: urlData } = supabaseClient
                    .storage
                    .from(successfulBucket)
                    .getPublicUrl(filePath);

                finalImageUrl = urlData.publicUrl;
            } else if (!producto) {
                window.mostrarToast('Por favor selecciona un archivo de imagen.', 'error');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                return;
            }

            const payload = {
                nombre: inputNombre.value,
                descripcion: inputDescripcion.value,
                precio: parseFloat(inputPrecio.value),
                cantidad: parseInt(inputCantidad.value),
                categoria: inputCategoria.value,
                imagen_url: finalImageUrl
            };

            let error = null;
            let data = null;

            if (id) {
                // Update
                const res = await supabaseClient.from('productos').update(payload).eq('id', id).select();
                error = res.error;
                data = res.data;
            } else {
                // Insert
                const res = await supabaseClient.from('productos').insert([payload]).select();
                error = res.error;
                data = res.data;
            }

            submitBtn.textContent = originalText;
            submitBtn.disabled = false;

            if (error) {
                console.error('Error al insertar/actualizar:', error);
                window.mostrarToast('Error al guardar producto: ' + error.message, 'error');
                return;
            }

            if (!data || data.length === 0) {
                window.mostrarToast('Error: No se guardaron los cambios. Esto ocurre si las políticas RLS (Row Level Security) en la tabla "productos" de Supabase están activas y bloquean la escritura.', 'error');
                return;
            }

            // Si se editó el producto y se subió una nueva imagen, borrar la antigua de Supabase Storage
            if (id && producto && producto.imagen_url && producto.imagen_url !== finalImageUrl) {
                const oldFilePath = obtenerFilePathDesdeUrl(producto.imagen_url);
                if (oldFilePath) {
                    try {
                        await supabaseClient
                            .storage
                            .from(successfulBucket)
                            .remove([oldFilePath]);
                    } catch (delErr) {
                        console.error('Error al borrar la imagen antigua:', delErr);
                    }
                }
            }

            window.mostrarToast('¡Producto guardado correctamente!', 'exito');
            modal.style.display = 'none';
            modalContainer.innerHTML = '';
            cargarProductosTable();
        } catch (err) {
            console.error('Error inesperado:', err);
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            window.mostrarToast('Error inesperado: ' + err.message, 'error');
        }
    };

    modal.style.display = 'block';

    clone.querySelector('.cerrar-modal').onclick = function () {
        modal.style.display = 'none';
        modalContainer.innerHTML = '';
    };

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
            modalContainer.innerHTML = '';
        }
    };

    modalContainer.appendChild(clone);
}
function editarProducto(index) {
    const prod = productosList[index];
    if (prod) {
        abrirModalForm(prod);
    }
}
async function eliminarProducto(index) {
    const prod = productosList[index];
    if (!prod) return;
    window.mostrarConfirmacion(`¿Estás seguro de que deseas eliminar el producto "${prod.nombre}"?`, async () => {
        try {
            const { data, error } = await supabaseClient.from('productos').delete().eq('id', prod.id).select();
            if (error) {
                console.error('Error al eliminar producto:', error);
                window.mostrarToast('Error al eliminar producto: ' + error.message, 'error');
                return;
            }
            if (!data || data.length === 0) {
                window.mostrarToast('Error: No se pudo eliminar el producto. Esto ocurre si las políticas RLS en Supabase están activas y bloquean la eliminación.', 'error');
                return;
            }

            // Si se elimina el producto, deberíamos eliminar su imagen de Storage (opcional pero recomendado)
            if (prod.imagen_url && prod.imagen_url.includes('storage/v1/object/public/')) {
                const urlParts = prod.imagen_url.split('/');
                const fileName = urlParts[urlParts.length - 1];
                // Asumimos que están en el bucket "imagenes" (el que usamos en guardar)
                const { error: storageError } = await supabaseClient.storage.from('imagenes').remove([fileName]);
                if (storageError) {
                    console.warn('Producto eliminado, pero la imagen no se pudo borrar de Storage:', storageError.message);
                }
            }

            window.mostrarToast('Producto eliminado con éxito.', 'exito');
            cargarProductosTable();
        } catch (err) {
            window.mostrarToast('Error inesperado: ' + err.message, 'error');
        }
    });
}
// Ejecutar verificación al cargar
document.addEventListener('DOMContentLoaded', verificarAcceso);
