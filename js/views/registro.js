// Funciones de utilidad se han movido a supabase-config.js (mostrarToast)

document.getElementById('registro-password').addEventListener('input', function(e) {
    const pass = e.target.value;
    const bar1 = document.getElementById('strength-bar-1');
    const bar2 = document.getElementById('strength-bar-2');
    const bar3 = document.getElementById('strength-bar-3');
    const bar4 = document.getElementById('strength-bar-4');
    const text = document.getElementById('password-strength-text');

    let strength = 0;
    
    if (pass.length > 5) strength += 1;
    if (pass.length > 8) strength += 1;
    if (/[A-Z]/.test(pass)) strength += 1;
    if (/[0-9]/.test(pass)) strength += 1;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 1;

    // Reset bars
    bar1.style.backgroundColor = 'transparent';
    bar2.style.backgroundColor = 'transparent';
    bar3.style.backgroundColor = 'transparent';
    bar4.style.backgroundColor = 'transparent';

    if (pass.length === 0) {
        text.textContent = 'Seguridad: Débil';
        text.style.color = '#666';
        return;
    }

    if (strength <= 1) {
        bar1.style.backgroundColor = '#ff4d4d'; // Rojo
        text.textContent = 'Seguridad: Muy Débil';
        text.style.color = '#ff4d4d';
    } else if (strength === 2) {
        bar1.style.backgroundColor = '#f39c12'; // Naranja
        bar2.style.backgroundColor = '#f39c12';
        text.textContent = 'Seguridad: Débil';
        text.style.color = '#f39c12';
    } else if (strength === 3 || strength === 4) {
        bar1.style.backgroundColor = '#f1c40f'; // Amarillo
        bar2.style.backgroundColor = '#f1c40f';
        bar3.style.backgroundColor = '#f1c40f';
        text.textContent = 'Seguridad: Buena';
        text.style.color = '#f1c40f';
    } else if (strength >= 5) {
        bar1.style.backgroundColor = '#1fb546'; // Verde
        bar2.style.backgroundColor = '#1fb546';
        bar3.style.backgroundColor = '#1fb546';
        bar4.style.backgroundColor = '#1fb546';
        text.textContent = 'Seguridad: Fuerte';
        text.style.color = '#1fb546';
    }
});

document.getElementById('formulario-registro').addEventListener('submit', async function(e) {
            e.preventDefault();
            const nombre = document.getElementById('registro-nombre').value;
            const email = document.getElementById('registro-email').value;
            const telefono = document.getElementById('registro-telefono').value;
            const pass = document.getElementById('registro-password').value;
            const passConfirm = document.getElementById('registro-password-confirm').value;
            if (pass !== passConfirm) {
                mostrarToast('Las contraseñas no coinciden. Por favor, verifica e intenta nuevamente.', 'error');
                return;
            }
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Registrando...';
            submitBtn.disabled = true;
            try {
                const { data, error } = await supabaseClient.auth.signUp({
                    email: email,
                    password: pass,
                    options: {
                        data: {
                            full_name: nombre,
                            telefono: telefono
                        }
                    }
                });
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                if (error) {
                    mostrarToast('Error al registrar usuario: ' + error.message, 'error');
                    return;
                }
                mostrarToast('¡Registro exitoso! Redirigiendo al inicio de sesión...', 'exito');
                setTimeout(() => {
                    window.location.href = '../index.html?login=true';
                }, 1500);
            } catch (err) {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                mostrarToast('Ocurrió un error inesperado: ' + err.message, 'error');
            }
        });

