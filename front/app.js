/**
 * Aplicación de Sistema Financiero - NEXUS
 * Arquitectura: Cliente (JS) -> GCP Compute Engine (Java) -> Cloud SQL
 */

class AplicacionFinanciera {
    constructor() {
        const IP_VM = '35.225.210.172'; // IP Externa VM

        this.urlAuth = `http://${IP_VM}:8081`;           // AuthService
        this.urlTransacciones = `http://${IP_VM}:8080`; // AccountService
		this.urlAdmin = `http://${IP_VM}:8090`; // AdminService

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
			
			if (curp.toUpperCase().startsWith("ADMIN")) {
				window.location.href = "panel_admin.html";
				return;
			}

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
			
			if (curpRegistro.value.toUpperCase().startsWith("ADMIN")) {
				mostrarErrorRegistro("Los usuarios ADMIN no pueden registrarse desde esta página.");
				return;
			}


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
	
	// ================= HISTORIAL =================

	async cargarHistorialUsuario_Panel() {
		try {
			const res = await fetch(`${this.urlTransacciones}/cuenta/historial`, {
				headers: this.obtenerEncabezadosAutenticacion()
			});

			if (!res.ok) throw new Error("No se pudo obtener el historial");

			const historial = await res.json();
			this.renderizarListaTransacciones(historial);

		} catch (error) {
			console.error(error);
		}
	}

	renderizarListaTransacciones(historial) {
		const contenedor = document.getElementById('listaTransacciones');
		if (!contenedor) return;

		if (historial.length === 0) {
			contenedor.innerHTML = `
				<p class="text-muted text-center">Sin movimientos aún.</p>
			`;
			return;
		}

		let html = `
			<ul class="list-group">
		`;

		historial.forEach(tx => {

			let icono = "bi-arrow-left-right text-primary";
			if (tx.tipo === "DEPOSITO") icono = "bi-arrow-down text-success";
			if (tx.tipo === "RETIRO") icono = "bi-arrow-up text-danger";
			if (tx.tipo === "TRANSFERENCIA_SALIENTE") icono = "bi-arrow-right text-warning";
			if (tx.tipo === "TRANSFERENCIA_ENTRANTE") icono = "bi-arrow-left text-info";

			html += `
				<li class="list-group-item">
					<div class="d-flex justify-content-between">
						<div>
							<i class="bi ${icono} me-2"></i>
							<strong>${tx.tipo.replace("_", " ")}</strong>
							<div class="small text-muted">${tx.fecha}</div>
						</div>
						<div class="fw-bold">
							$${Number(tx.monto).toLocaleString()}
						</div>
					</div>
					<div class="small text-muted">
						De: ${tx.origen} → Para: ${tx.destino}
					</div>
				</li>
			`;
		});

		html += `</ul>`;
		contenedor.innerHTML = html;
	}

	// ================= ADMIN =================

    inicializarPanelAdmin() {
        this.inicializarGraficas();
    }

    // Inicialización completa del panel admin (dashboard, auditoría, usuarios)
    inicializarPanelAdmin_Completo() {
        this.cargarDashboard();
        this.cargarTablaAuditoria_Completo();
        this.loadUsersList();
    }

    async cargarDashboard() {
        try {
            const r = await fetch(`${this.urlAdmin}/admin/dashboard`, {
                headers: this.auth()
            });
            if (!r.ok) throw new Error('Error cargando dashboard');
            const d = await r.json();
            const kpiTotal = document.getElementById("kpiTotalMoney");
            const kpiUsers = document.getElementById("kpiUsers");
            const kpiTx = document.getElementById("kpiTransactions");
            if (kpiTotal) kpiTotal.innerText = "$" + Number(d.dinero).toFixed(2);
            if (kpiUsers) kpiUsers.innerText = d.usuarios;
            if (kpiTx) kpiTx.innerText = d.transacciones;
        } catch (err) {
            console.error('Dashboard error', err);
        }
    }

    async cargarTablaAuditoria_Completo() {
        try {
            const r = await fetch(`${this.urlAdmin}/admin/auditoria`, {
                headers: this.auth()
            });
            if (!r.ok) throw new Error('Error cargando auditoría');
            const data = await r.json();
            const t = document.getElementById("cuerpoTablaAuditoria");
            if (!t) return;
            t.innerHTML = "";
            data.forEach(e => {
                t.innerHTML += `
            <tr>
                <td>${e.t}</td><td>${e.o}</td><td>${e.d}</td>
                <td>${e.op}</td><td class="text-end">$${Number(e.m).toFixed(2)}</td><td>${e.e}</td>
            </tr>`;
            });
        } catch (err) {
            console.error('Auditoría error', err);
        }
    }

    async loadUsersList() {
        try {
            const r = await fetch(`${this.urlAdmin}/admin/usuarios`, {
                headers: this.auth()
            });
            if (!r.ok) throw new Error('Error cargando usuarios');
            const data = await r.json();
            const t = document.getElementById("cuerpoTablaUsuarios");
            if (!t) return;
            t.innerHTML = "";
            data.forEach(u => {
                t.innerHTML += `
            <tr>
                <td>${u.curp}</td><td>${u.nombre}</td>
                <td>$${Number(u.saldo).toFixed(2)}</td><td>-</td><td>${u.estado}</td><td>-</td>
            </tr>`;
            });
        } catch (err) {
            console.error('Usuarios error', err);
        }
    }

    logout() {
        localStorage.removeItem(this.clavToken);
        window.location.href = "login.html";
    }

    auth() {
        return {
            'Authorization': 'Bearer ' + localStorage.getItem(this.clavToken)
        };
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

	
}

// ================= INICIALIZACIÓN =================

const app = new AplicacionFinanciera();

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.includes('panel_usuario')) app.cargarDatosUsuario_Panel();
    if (path.includes('admin')) app.inicializarPanelAdmin_Completo();
});
