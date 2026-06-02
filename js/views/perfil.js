// Funciones de utilidad se han movido a supabase-config.js (mostrarToast)

document.addEventListener("DOMContentLoaded", async () => {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error || !session) {
        window.location.href = '../index.html?login=true';
        return;
    }

    const emailInput = document.getElementById('perfil-email');
    const telefonoInput = document.getElementById('perfil-telefono');
    const nombreInput = document.getElementById('perfil-nombre');
    const form = document.getElementById('formulario-perfil');
    const btnGuardar = document.getElementById('btn-guardar-perfil');

    // Cargar datos actuales
    emailInput.value = session.user.email;
    
    // Obtener datos desde profile
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('full_name, telefono')
        .eq('id', session.user.id)
        .maybeSingle();
        
    if (profile && profile.full_name) {
        nombreInput.value = profile.full_name;
    } else if (session.user.user_metadata?.full_name) {
        nombreInput.value = session.user.user_metadata.full_name;
    }

    if (profile && profile.telefono) {
        telefonoInput.value = profile.telefono;
    } else if (session.user.user_metadata?.telefono) {
        telefonoInput.value = session.user.user_metadata.telefono;
    }

    form.onsubmit = async (e) => {
        e.preventDefault();
        const nuevoNombre = nombreInput.value.trim();
        const nuevoEmail = emailInput.value.trim();
        const nuevoTelefono = telefonoInput.value.trim();
        const nuevaPass = document.getElementById('perfil-password-nueva').value;
        
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Guardando...';
        const loadingToast = mostrarToast('Guardando cambios...', 'cargando');

        try {
            // Actualizar email si cambió
            if (nuevoEmail !== session.user.email) {
                const { error: errorEmail } = await supabaseClient.auth.updateUser({
                    email: nuevoEmail
                });
                if (errorEmail) throw errorEmail;
            }

            // Actualizar password si hay
            if (nuevaPass) {
                const { error: errorAuth } = await supabaseClient.auth.updateUser({
                    password: nuevaPass
                });
                if (errorAuth) throw errorAuth;
            }

            // Actualizar nombre y telefono en metadata
            const { error: errorMeta } = await supabaseClient.auth.updateUser({
                data: { full_name: nuevoNombre, telefono: nuevoTelefono }
            });
            if (errorMeta) throw errorMeta;

            // Actualizar nombre y telefono en profiles
            const { error: errorProfile } = await supabaseClient
                .from('profiles')
                .update({ full_name: nuevoNombre, telefono: nuevoTelefono })
                .eq('id', session.user.id);
                
            // Ignoramos errorProfile si la tabla profile no existe o RLS, pero lo logueamos
            if (errorProfile) {
                console.warn('No se pudo actualizar la tabla profiles.', errorProfile.message);
            }
            
            loadingToast.remove();
            
            if (nuevoEmail !== session.user.email) {
                mostrarToast('¡Cambios guardados! Revisa tu correo antiguo y nuevo para confirmar el cambio de email.', 'exito');
            } else {
                mostrarToast('¡Cambios guardados con éxito!', 'exito');
            }
            
            // Limpiar password
            document.getElementById('perfil-password-nueva').value = '';

        } catch (err) {
            loadingToast.remove();
            mostrarToast('Error al guardar: ' + err.message, 'error');
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = '<i class="fa fa-save"></i> Guardar Cambios';
        }
    };
});
