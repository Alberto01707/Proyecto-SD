/**
 * Aplicación de Sistema Financiero
 */

class AplicacionFinanciera {
    constructor() {
        const IP_VM = '35.225.210.172'; // IP Externa VM

        this.urlAuth = `http://${IP_VM}:8081`;           // AuthService
        this.urlTransacciones = `http://${IP_VM}:8080`; // AccountService

        this.clavToken = 'jwt_token';
        this.clavUsuarioActual = 'usuarioActual';
        this.saldoActual = 0;
    }

    // ================= UTILIDADES =================

    obtenerEncabezadosAutenticacion() {
        const token = localStorage.getItem(this.clavToken);
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    // ================= AUTENTICACIÓN (Inicio de Sesion y Registro)=================

    async iniciarSesion() {
        const curp = document.getElementById('curpIngreso').value.toUpperCase();
        const contrasena = document.getElementById('contrasenaIngreso').value;
        const alertaError = document.getElementById('errorIngreso');

        alertaError.classList.add('d-none');

        try {
            const response = await fetch(`${this.urlAuth}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ curp, password: contrasena })
            });

            if (!response.ok) throw new Error("Credenciales incorrectas");

            const data = await response.json();
            localStorage.setItem(this.clavToken, data.token);
            localStorage.setItem(this.clavUsuarioActual, curp);

            window.location.href = 'panel_usuario.html';

        } catch (error) {
            alertaError.textContent = error.message;
            alertaError.classList.remove('d-none');
        }
    }

    cerrarSesion() {
        localStorage.removeItem(this.clavToken);
        localStorage.removeItem(this.clavUsuarioActual);
        window.location.href = 'login.html';
    }
	
	async registrar() {
		const nombre = document.getElementById('nombreRegistro').value;
		const curp = document.getElementById('curpRegistro').value.toUpperCase();
		const email = document.getElementById('emailRegistro').value;
		const pass1 = document.getElementById('contrasenaRegistro').value;
		const pass2 = document.getElementById('contrasenaConfirmacion').value;
		const errorBox = document.getElementById('errorRegistro');

		errorBox.classList.add('d-none');

		if (pass1 !== pass2) {
			errorBox.textContent = "Las contraseñas no coinciden";
			errorBox.classList.remove('d-none');
			return;
		}

		try {
			const response = await fetch(`${this.urlAuth}/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					curp,
					password: pass1,
					nombre,
					email
				})
			});

			const data = await response.json();
			if (!response.ok) throw new Error(data.error || "Error al registrar");

			alert("Usuario registrado correctamente. Ahora puedes iniciar sesión.");
			document.querySelector('[data-pestana="ingreso"]').click();

		} catch (error) {
			errorBox.textContent = error.message;
			errorBox.classList.remove('d-none');
		}
	}
	
	alternarContrasena(idCampo) {
		const campo = document.getElementById(idCampo);
		if (!campo) return;
		campo.type = campo.type === 'password' ? 'text' : 'password';
	}



    // ================= PANEL USUARIO =================

    async cargarDatosUsuario_Panel() {
        const usuario = localStorage.getItem(this.clavUsuarioActual);
        const saludo = document.getElementById('saludoUsuario');
        if (saludo) saludo.textContent = usuario || 'Usuario';

        try {
            const res = await fetch(`${this.urlTransacciones}/cuenta/saldo`, {
				headers: this.obtenerEncabezadosAutenticacion()
			});

			if (res.status === 401 || res.status === 403) {
				this.cerrarSesion();
				return;
			}

			if (!res.ok) {
				throw new Error("Error al obtener saldo");
			}
            const data = await res.json();
            this.saldoActual = data.saldo_monedero;
            this.actualizarResumenVisual(data);
            this.cargarHistorialUsuario_Panel();

        } catch (error) {
            console.error("Error backend:", error);
        }
    }

    actualizarResumenVisual(data) {
        const format = v => `$${Number(v).toLocaleString()} MXN`;
        document.getElementById('saldoUsuario').textContent = format(data.saldo_monedero);
        document.getElementById('saldoDisponibleRetiro').textContent = format(data.saldo_monedero);
    }

    // ================= TRANSACCIONES =================
	
	gestionarTransaccion_Completa(tipo) {
		if (tipo === 'DEPOSITO') {
			document.getElementById('montoOperacion').value =
				document.getElementById('montoDeposito').value;
		}

		if (tipo === 'RETIRO') {
			document.getElementById('montoOperacion').value =
				document.getElementById('montoRetiro').value;
		}

		if (tipo === 'TRANSFERENCIA') {
			document.getElementById('montoOperacion').value =
				document.getElementById('montoTransferencia').value;
		}

		this.gestionarTransaccion(tipo);
	}


    async gestionarTransaccion(tipo) {
		try {
			const monto = parseFloat(document.getElementById('montoOperacion').value);
			if (isNaN(monto) || monto <= 0) throw new Error("Monto inválido");

			let endpoint = '';
			let payload = {};

			if (tipo === 'TRANSFERENCIA') {
				const destino = document.getElementById('destinoTransferencia').value.toUpperCase();

				if (destino.length !== 18) throw new Error("CURP inválida");
				if (monto > this.saldoActual) throw new Error("Saldo insuficiente");

				endpoint = '/transferir';
				payload = { curp_destino: destino, monto };

			} else if (tipo === 'DEPOSITO') {
				endpoint = '/cuenta/deposito';
				payload = { monto };

			} else if (tipo === 'RETIRO') {
				if (monto > this.saldoActual) throw new Error("Saldo insuficiente");

				endpoint = '/cuenta/retiro';
				payload = { monto };

			} else {
				throw new Error("Operación no disponible");
			}

			const response = await fetch(`${this.urlTransacciones}${endpoint}`, {
				method: 'POST',
				headers: this.obtenerEncabezadosAutenticacion(),
				body: JSON.stringify(payload)
			});

			if (response.status === 401 || response.status === 403) {
				this.cerrarSesion();
				return;
			}

			const res = await response.json();
			if (!response.ok) throw new Error(res.error || "Error en operación");


			this.mostrarRetroalimentacion(
				"Éxito",
				res.mensaje || "Operación realizada correctamente",
				"bi-check-circle-fill text-success"
			);

			this.cargarDatosUsuario_Panel();

		} catch (error) {
			this.mostrarRetroalimentacion(
				"Error",
				error.message,
				"bi-x-circle-fill text-danger"
			);
		}
	}


    // ================= HISTORIAL =================

    cargarHistorialUsuario_Panel() {
        const contenedor = document.getElementById('listaTransacciones');
        if (!contenedor) return;

        contenedor.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="bi bi-cloud-check fs-2"></i>
                <p class="mt-2">
                    Las transacciones se procesan de forma asíncrona
                    mediante Google Pub/Sub.
                </p>
            </div>
        `;
    }

    renderizarListaTransacciones() {
        console.warn("Historial aún no disponible por HTTP");
    }

    // ================= ADMIN =================

    inicializarPanelAdmin() {
        this.inicializarGraficas();
    }

    inicializarGraficas() {
        const canvas = document.getElementById('graficoTransacciones');
        if (!canvas || typeof Chart === 'undefined') return;

        new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['10:00', '10:10', '10:20', '10:30'],
                datasets: [{
                    label: 'Actividad del Sistema',
                    data: [2, 5, 3, 6],
                    borderWidth: 2,
                    tension: 0.3
                }]
            },
            options: { responsive: true }
        });
    }

    // ================= MODAL =================

    mostrarRetroalimentacion(titulo, mensaje, claseIcono) {
        const modalEl = document.getElementById('modalRetroalimentacion');
        if (!modalEl) return;

        const modal = new bootstrap.Modal(modalEl);
        document.getElementById('tituloRetroalimentacion').textContent = titulo;
        document.getElementById('mensajeRetroalimentacion').textContent = mensaje;
        document.getElementById('iconoRetroalimentacion').className =
            `mb-3 display-4 ${claseIcono}`;

        modal.show();
    }
}

// ================= INICIALIZACIÓN =================

const app = new AplicacionFinanciera();

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.includes('panel_usuario')) app.cargarDatosUsuario_Panel();
    if (path.includes('admin')) app.inicializarPanelAdmin();
});
