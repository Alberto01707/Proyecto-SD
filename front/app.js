/**
 * Aplicación de Sistema Financiero
 * Sistema de Dinero Electrónico - Arquitectura Financiera
 */

class AplicacionFinanciera {
    constructor() {
        this.urlBaseApi = 'http://localhost:8080/api';
        this.clavToken = 'jwt_token';
        this.clavUsuarioActual = 'usuarioActual';
        this.clavRolUsuario = 'rolUsuario';
        this.todasLasTransacciones = [];
        this.todosLosUsuarios = [];
        this.saldoActual = null;
    }

    // ========== AUTENTICACIÓN ==========

    /**
     * Inicia sesión y guarda el JWT
     */
    async iniciarSesion() {
        const curp = document.getElementById('curpIngreso').value.toUpperCase();
        const contrasena = document.getElementById('contrasenaIngreso').value;
        const alertaError = document.getElementById('errorIngreso');
        const msgError = document.getElementById('msgErrorIngreso');

        // Reiniciar interfaz
        alertaError.classList.add('d-none');

        try {
            // Simulación de llamada API
            console.log(`Autenticando ${curp}...`);

            // POR HACER: Reemplazar con fetch()
            // const response = await fetch(`${this.urlBaseApi}/auth/login`, { ... });

            // SIMULACIÓN DE INGRESO EXITOSO
            if (curp && contrasena) {
                const tokenMock = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock";
                localStorage.setItem(this.clavToken, tokenMock);
                localStorage.setItem(this.clavUsuarioActual, curp);

                // Redirigir según rol (lógica simulada)
                if (curp.startsWith('ADMIN')) {
                    window.location.href = 'panel_administrador.html';
                } else {
                    window.location.href = 'panel_usuario.html';
                }
            } else {
                throw new Error("Credenciales vacías");
            }

        } catch (error) {
            console.error(error);
            alertaError.textContent = "Error al iniciar sesión. Verifique sus credenciales.";
            alertaError.classList.remove('d-none');
        }
    }

    cerrarSesion() {
        localStorage.removeItem(this.clavToken);
        localStorage.removeItem(this.clavUsuarioActual);
        window.location.href = 'login.html';
    }

    // --- Métodos del Portal del Usuario ---

    async cargarDatosUsuario() {
        const usuario = localStorage.getItem(this.clavUsuarioActual);
        document.getElementById('saludoUsuario').textContent = usuario || 'Usuario';

        // Cargar Saldo
        // POR HACER: await fetch(`${this.urlBaseApi}/cuenta/saldo`, { headers: this.obtenerEncabezadosAutenticacion() });
        document.getElementById('saldoUsuario').textContent = "$12,500.50 MXN"; // Temporal

        // Cargar Historial
        this.cargarHistorialUsuario();
    }

    async cargarHistorialUsuario() {
        const tbody = document.getElementById('cuerpoTablaHistorial');
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Cargando...</td></tr>';

        // Datos simulados
        const historialMock = [
            { date: '2023-10-25 10:30', type: 'DEPOSITO', amount: 500.00, status: 'Completado' },
            { date: '2023-10-24 18:15', type: 'TRANSFERENCIA', amount: -200.00, status: 'Completado' },
            { date: '2023-10-23 09:00', type: 'RETIRO', amount: -1000.00, status: 'Pendiente' },
        ];

        setTimeout(() => {
            tbody.innerHTML = '';
            historialMock.forEach(tx => {
                const colorClass = tx.amount > 0 ? 'text-success' : 'text-danger';
                const row = `
                    <tr>
                        <td class="ps-4">${tx.date}</td>
                        <td>${this.traducirTipo(tx.type)}</td>
                        <td class="text-end fw-bold ${colorClass}">$${Math.abs(tx.amount).toFixed(2)}</td>
                        <td class="text-center"><span class="badge bg-secondary">${tx.status}</span></td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', row);
            });
        }, 500);
    }

    traducirTipo(tipo) {
        const mapa = { 'DEPOSITO': 'Depósito', 'RETIRO': 'Retiro', 'TRANSFERENCIA': 'Transferencia' };
        return mapa[tipo] || tipo;
    }

    async gestionarTransaccion(tipo) {
        let payload = {};
        let endpoint = '';

        try {
            if (tipo === 'DEPOSITO') {
                payload.monto = document.getElementById('montoDeposito').value;
                endpoint = '/depositar';
            } else if (tipo === 'RETIRO') {
                payload.monto = document.getElementById('montoRetiro').value;
                endpoint = '/retirar';
            } else if (tipo === 'TRANSFERENCIA') {
                const destino = document.getElementById('destinoTransferencia').value;
                const monto = document.getElementById('montoTransferencia').value;
                const usuario = localStorage.getItem(this.clavUsuarioActual);

                // Payload alineado con el ejemplo
                payload = {
                    curp_origen: usuario,
                    curp_destino: destino,
                    monto: monto
                };
                endpoint = '/transferir';
            }

            // Validación
            if (!payload.monto && !payload.amount) throw new Error("Monto requerido");

            // POR HACER: Descomenta cuando el backend esté listo
            /*
            const response = await fetch(`${this.urlBaseApi}${endpoint}`, {
                method: 'POST',
                headers: this.obtenerEncabezadosAutenticacion(),
                body: JSON.stringify(payload)
            });
            const res = await response.json();
            */

            console.log(`Ejecutando ${tipo} a ${endpoint}`, payload);

            // Mostrar mensaje de éxito
            this.mostrarRetroalimentacion("¡Operación Exitosa!", "La transacción se ha procesado correctamente.", "bi-check-circle-fill text-success");

            // Recargar datos
            this.cargarDatosUsuario();

        } catch (e) {
            console.error(e);
            this.mostrarRetroalimentacion("Error", "No se pudo realizar la operación.", "bi-x-circle-fill text-danger");
        }
    }

    mostrarRetroalimentacion(titulo, mensaje, claseIcono) {
        const modalEl = new bootstrap.Modal(document.getElementById('modalRetroalimentacion'));
        document.getElementById('tituloRetroalimentacion').textContent = titulo;
        document.getElementById('mensajeRetroalimentacion').textContent = mensaje;
        document.getElementById('iconoRetroalimentacion').className = `mb-3 display-4 ${claseIcono}`;
        modalEl.show();
    }

    // --- Métodos del Panel del Administrador ---

    inicializarPanelAdmin() {
        // KPIs simulados
        document.getElementById('kpiTotalDinero').textContent = "$1,250,000.00";
        document.getElementById('kpiUsuarios').textContent = "1,042";
        document.getElementById('kpiTransacciones').textContent = "58,921";

        // Inicializar Gráficas
        this.inicializarGraficas();

        // Inicializar Tabla de Auditoría
        this.cargarTablaAuditoria();
    }

    inicializarGraficas() {
        // Gráfica de Transacciones (Línea)
        const ctxTx = document.getElementById('graficoTransacciones').getContext('2d');
        new Chart(ctxTx, {
            type: 'line',
            data: {
                labels: ['10:00', '10:05', '10:10', '10:15', '10:20', '10:25'],
                datasets: [{
                    label: 'Transacciones / Min',
                    data: [12, 19, 15, 25, 22, 30],
                    borderColor: '#003153',
                    backgroundColor: 'rgba(0, 49, 83, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true }
        });

        // Gráfica de Volumen (Barras)
        const ctxVol = document.getElementById('graficoVolumen').getContext('2d');
        new Chart(ctxVol, {
            type: 'bar',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                datasets: [{
                    label: 'Volumen Global (MXN)',
                    data: [50000, 75000, 60000, 90000, 120000, 110000],
                    backgroundColor: '#50c878',
                }]
            },
            options: { responsive: true }
        });
    }

    cargarTablaAuditoria() {
        const tbody = document.getElementById('cuerpoTablaAuditoria');
        // Registros simulados
        const registros = [
            { time: '10:25:01', from: 'CURP001', to: 'Sistema', op: 'Depósito', amount: 500 },
            { time: '10:24:55', from: 'CURP002', to: 'CURP003', op: 'Transferencia', amount: 120 },
            { time: '10:24:10', from: 'CURP005', to: 'Sistema', op: 'Retiro', amount: 200 },
        ];

        tbody.innerHTML = '';
        registros.forEach(log => {
            const row = `
                <tr>
                    <td class="ps-3 text-muted family-monospace">${log.time}</td>
                    <td>${log.from}</td>
                    <td>${log.to}</td>
                    <td><span class="badge bg-light text-dark border">${log.op}</span></td>
                    <td class="text-end pe-3 fw-bold">$${log.amount}</td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    }

    // ========== REGISTRO ==========

    async registrar() {
        const nombre = document.getElementById('nombreRegistro').value;
        const curp = document.getElementById('curpRegistro').value.toUpperCase();
        const email = document.getElementById('emailRegistro').value;
        const contrasena = document.getElementById('contrasenaRegistro').value;
        const contrasenaConfirm = document.getElementById('contrasenaConfirmacion').value;
        const alertaError = document.getElementById('errorRegistro');
        const msgError = document.getElementById('msgErrorRegistro');

        alertaError.classList.add('d-none');

        try {
            // Validaciones
            if (contrasena !== contrasenaConfirm) {
                throw new Error("Las contraseñas no coinciden");
            }
            if (curp.length !== 18) {
                throw new Error("CURP debe tener 18 caracteres");
            }
            if (contrasena.length < 6) {
                throw new Error("La contraseña debe tener al menos 6 caracteres");
            }

            // Simulación de registro
            console.log(`Registrando usuario: ${nombre} (${curp})`);
            
            // Simulación de éxito
            const tokenMock = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock";
            localStorage.setItem(this.clavToken, tokenMock);
            localStorage.setItem(this.clavUsuarioActual, curp);
            localStorage.setItem(this.clavRolUsuario, 'USUARIO');

            // Mostrar retroalimentación y redirigir
            const modalRetroalimentacion = new bootstrap.Modal(document.getElementById('modalRetroalimentacion'));
            document.getElementById('tituloRetroalimentacion').textContent = "¡Bienvenido!";
            document.getElementById('mensajeRetroalimentacion').textContent = `Tu cuenta ha sido creada exitosamente, ${nombre.split(' ')[0]}`;
            document.getElementById('iconoRetroalimentacion').innerHTML = '<i class="bi bi-check-circle text-success"></i>';
            modalRetroalimentacion.show();

            setTimeout(() => {
                window.location.href = 'panel_usuario.html';
            }, 1500);

        } catch (error) {
            console.error(error);
            msgError.textContent = error.message;
            alertaError.classList.remove('d-none');
        }
    }

    // ========== UTILIDADES GLOBALES ==========

    alternarContrasena(idEntrada) {
        const entrada = document.getElementById(idEntrada);
        if (entrada.type === 'password') {
            entrada.type = 'text';
        } else {
            entrada.type = 'password';
        }
    }

    // ========== PANEL DE USUARIO ==========

    async cargarDatosUsuario_Panel() {
        const usuario = localStorage.getItem(this.clavUsuarioActual);
        document.getElementById('saludoUsuario').textContent = usuario || 'Usuario';

        // Estado inicial sin datos hasta que el backend responda
        this.actualizarResumenCuenta({
            saldo: null,
            totalDepositado: null,
            totalRetirado: null,
            totalTransferido: null,
            totalTransacciones: null
        });

        // Cuando exista backend, reemplazar por fetch y alimentar this.todasLasTransacciones
        await this.cargarHistorialUsuario_Panel();
    }

    actualizarResumenCuenta({ saldo, totalDepositado, totalRetirado, totalTransferido, totalTransacciones }) {
        const formatMonto = (valor) => valor === null || valor === undefined ? '--' : `$${Number(valor).toFixed(2)}`;
        const formatEntero = (valor) => valor === null || valor === undefined ? '--' : Number(valor).toLocaleString('en-US');

        this.saldoActual = saldo ?? null;

        document.getElementById('saldoUsuario').textContent = formatMonto(saldo);
        document.getElementById('saldoDisponibleRetiro').textContent = formatMonto(saldo);
        document.getElementById('totalDepositado').textContent = formatMonto(totalDepositado);
        document.getElementById('totalRetirado').textContent = formatMonto(totalRetirado);
        document.getElementById('totalTransferido').textContent = formatMonto(totalTransferido);
        document.getElementById('totalTransacciones').textContent = formatEntero(totalTransacciones);
    }

    async cargarHistorialUsuario_Panel() {
        // Cuando haya backend, reemplazar por fetch al historial del usuario
        this.todasLasTransacciones = [];
        this.renderizarListaTransacciones(this.todasLasTransacciones);
    }

    renderizarListaTransacciones(transacciones) {
        const contenedor = document.getElementById('listaTransacciones');
        
        if (!transacciones || transacciones.length === 0) {
            contenedor.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="bi bi-inbox"></i></div>
                    <p class="mb-1 fw-semibold">Aún no hay movimientos</p>
                    <p class="text-muted mb-0 small">Tus transacciones aparecerán aquí cuando el backend esté disponible.</p>
                </div>`;
            this.toggleFiltrosHistorial(false);
            return;
        }

        this.toggleFiltrosHistorial(true);
        let html = '';
        transacciones.forEach(tx => {
            const esPositivo = tx.type === 'DEPOSITO';
            const icono = tx.type === 'DEPOSITO' ? 'arrow-down-circle' : (tx.type === 'RETIRO' ? 'arrow-up-circle' : 'arrow-left-right');
            const claseIcono = tx.type === 'DEPOSITO' ? 'deposit' : (tx.type === 'RETIRO' ? 'withdraw' : 'transfer');
            const claseEstado = tx.status === 'COMPLETADA' ? 'badge-success' : (tx.status === 'PENDIENTE' ? 'badge-warning' : 'badge-danger');
            const textoEstado = tx.status === 'COMPLETADA' ? 'Completada' : (tx.status === 'PENDIENTE' ? 'Pendiente' : 'Fallida');

            html += `
                <div class="transaction-item">
                    <div class="transaction-icon ${claseIcono}">
                        <i class="bi bi-${icono}"></i>
                    </div>
                    <div class="transaction-details">
                        <div class="transaction-type">${this.traducirTipo(tx.type)}</div>
                        <div class="transaction-time">${tx.date}</div>
                    </div>
                    <div class="text-end">
                        <div class="transaction-amount ${esPositivo ? 'positive' : 'negative'}">
                            ${esPositivo ? '+' : '-'}$${Math.abs(tx.amount).toFixed(2)}
                        </div>
                        <span class="badge ${claseEstado}">${textoEstado}</span>
                    </div>
                </div>
            `;
        });

        contenedor.innerHTML = html;
    }

    aplicarFiltroHistorial() {
        const filtroTipo = document.getElementById('filtroTipo').value;
        const filtroEstado = document.getElementById('filtroEstado').value;

        let filtrados = this.todasLasTransacciones;

        if (filtroTipo) {
            filtrados = filtrados.filter(tx => tx.type === filtroTipo);
        }

        if (filtroEstado) {
            filtrados = filtrados.filter(tx => tx.status === filtroEstado);
        }

        this.renderizarListaTransacciones(filtrados);
    }

    toggleFiltrosHistorial(visible) {
        const filtros = document.getElementById('filtrosHistorial');
        if (!filtros) return;
        filtros.classList.toggle('d-none', !visible);
    }

    // ========== TRANSACCIONES ==========

    transaccionPendiente = null;

    async gestionarTransaccion_Completa(tipo) {
        let payload = {};
        let titulo = '';
        let detalles = '';

        try {
            if (tipo === 'DEPOSITO') {
                const monto = parseFloat(document.getElementById('montoDeposito').value);
                if (monto <= 0) throw new Error("El monto debe ser mayor a 0");
                
                payload = { monto };
                titulo = 'Depósito';
                detalles = `Depositar <strong>$${monto.toFixed(2)}</strong> a tu cuenta`;

            } else if (tipo === 'RETIRO') {
                const monto = parseFloat(document.getElementById('montoRetiro').value);
                if (monto <= 0) throw new Error("El monto debe ser mayor a 0");
                if (this.saldoActual === null) throw new Error("Saldo aún no disponible. Intenta más tarde.");
                if (monto > this.saldoActual) throw new Error("Saldo insuficiente");
                
                payload = { monto };
                titulo = 'Retiro';
                detalles = `Retirar <strong>$${monto.toFixed(2)}</strong> de tu cuenta`;

            } else if (tipo === 'TRANSFERENCIA') {
                const destino = document.getElementById('destinoTransferencia').value.toUpperCase();
                const monto = parseFloat(document.getElementById('montoTransferencia').value);
                
                if (destino.length !== 18) throw new Error("CURP debe tener 18 caracteres");
                if (monto <= 0) throw new Error("El monto debe ser mayor a 0");
                if (this.saldoActual === null) throw new Error("Saldo aún no disponible. Intenta más tarde.");
                if (monto > this.saldoActual) throw new Error("Saldo insuficiente");
                
                const usuario = localStorage.getItem(this.clavUsuarioActual);
                if (destino === usuario) throw new Error("No puedes transferir a tu propia cuenta");
                
                payload = {
                    curp_origen: usuario,
                    curp_destino: destino,
                    monto: monto
                };
                titulo = 'Transferencia';
                detalles = `Transferir <strong>$${monto.toFixed(2)}</strong> a ${destino}`;
            }

            this.transaccionPendiente = { tipo, payload };

            // Mostrar modal de confirmación
            const modalConfirmacion = new bootstrap.Modal(document.getElementById('modalConfirmacion'));
            document.getElementById('detallesConfirmacion').innerHTML = detalles;
            modalConfirmacion.show();

        } catch (error) {
            this.mostrarRetroalimentacion(
                "Error en la operación",
                error.message,
                '<i class="bi bi-exclamation-triangle text-danger"></i>'
            );
        }
    }

    async confirmarTransaccion() {
        if (!this.transaccionPendiente) return;

        const { tipo, payload } = this.transaccionPendiente;

        try {
            // Cerrar modal de confirmación
            bootstrap.Modal.getInstance(document.getElementById('modalConfirmacion')).hide();

            // Simular delay de procesamiento
            await new Promise(resolve => setTimeout(resolve, 500));

            // Simulación de éxito
            this.mostrarRetroalimentacion(
                "¡Operación Exitosa!",
                "Tu transacción ha sido procesada correctamente.",
                '<i class="bi bi-check-circle text-success"></i>'
            );

            // Limpiar formularios
            if (document.getElementById('montoDeposito')) document.getElementById('montoDeposito').value = '';
            if (document.getElementById('montoRetiro')) document.getElementById('montoRetiro').value = '';
            if (document.getElementById('destinoTransferencia')) document.getElementById('destinoTransferencia').value = '';
            if (document.getElementById('montoTransferencia')) document.getElementById('montoTransferencia').value = '';

            // Recargar datos después de 1.5 segundos
            setTimeout(() => {
                this.cargarDatosUsuario_Panel();
            }, 1500);

            this.transaccionPendiente = null;

        } catch (error) {
            this.mostrarRetroalimentacion(
                "Error al procesar",
                error.message,
                '<i class="bi bi-x-circle text-danger"></i>'
            );
        }
    }

    // ========== PANEL ADMINISTRADOR ==========

    inicializarPanelAdmin_Completo() {
        // KPIs con datos realistas
        document.getElementById('kpiTotalDinero').textContent = '$1,250,000.00';
        document.getElementById('kpiUsuarios').textContent = '1,042';
        document.getElementById('kpiTransacciones').textContent = '58,921';
        document.getElementById('ultimaSincronizacion').textContent = 'Hace 2 minutos';

        this.inicializarGraficas_Completo();
        this.cargarTablaAuditoria_Completo();
        this.cargarListaUsuarios();
    }

    inicializarGraficas_Completo() {
        // Gráfica de Transacciones por Minuto
        const ctxTx = document.getElementById('graficoTransacciones').getContext('2d');
        new Chart(ctxTx, {
            type: 'line',
            data: {
                labels: ['10:00', '10:05', '10:10', '10:15', '10:20', '10:25'],
                datasets: [{
                    label: 'Transacciones/Min',
                    data: [12, 19, 15, 25, 22, 30],
                    borderColor: '#0f3460',
                    backgroundColor: 'rgba(15, 52, 96, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#20c997',
                    pointBorderColor: '#0f3460',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    }
                }
            }
        });

        // Gráfica de Volumen
        const ctxVol = document.getElementById('graficoVolumen').getContext('2d');
        new Chart(ctxVol, {
            type: 'bar',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                datasets: [{
                    label: 'Volumen (MXN)',
                    data: [50000, 75000, 60000, 90000, 120000, 110000],
                    backgroundColor: [
                        '#20c997', '#20c997', '#20c997', '#20c997', '#20c997', '#20c997'
                    ],
                    borderColor: '#0f3460',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    }
                }
            }
        });
    }

    cargarTablaAuditoria_Completo() {
        const registros = [
            { time: '14:25:01', from: 'ABCD123456HDFABC00', to: 'Sistema', op: 'Depósito', amount: 500, status: 'COMPLETADA' },
            { time: '14:24:55', from: 'WXYZ987654JKLMNO11', to: 'ABCD123456HDFABC00', op: 'Transferencia', amount: 120, status: 'COMPLETADA' },
            { time: '14:24:10', from: 'QWER654321ASDFGH22', to: 'Sistema', op: 'Retiro', amount: 200, status: 'PENDIENTE' },
            { time: '14:23:45', from: 'ABCD123456HDFABC00', to: 'TYUI321654ZXCVBN33', op: 'Transferencia', amount: 350, status: 'COMPLETADA' },
            { time: '14:23:12', from: 'Sistema', to: 'ZXCV456789BNMKLO44', op: 'Depósito', amount: 1000, status: 'COMPLETADA' },
        ];

        this.todasLasTransacciones = registros;
        this.renderizarTablaAuditoria(registros);
        document.getElementById('totalAuditoria').textContent = registros.length;
    }

    renderizarTablaAuditoria(registros) {
        const tbody = document.getElementById('cuerpoTablaAuditoria');
        let html = '';

        registros.forEach(log => {
            const badgeEstado = log.status === 'COMPLETADA' ? 'badge-success' : (log.status === 'PENDIENTE' ? 'badge-warning' : 'badge-danger');
            
            html += `
                <tr>
                    <td class="ps-4"><small class="text-monospace">${log.time}</small></td>
                    <td><small>${log.from}</small></td>
                    <td><small>${log.to}</small></td>
                    <td><span class="badge bg-light text-dark">${log.op}</span></td>
                    <td class="text-end"><strong>$${log.amount}</strong></td>
                    <td class="pe-4"><span class="badge ${badgeEstado}">${log.status}</span></td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    filtrarTablaAuditoria() {
        const filtroClaveOrig = document.getElementById('filtroClaveAuditoria').value.toUpperCase();
        const filtroTipo = document.getElementById('filtroTipoAuditoria').value;

        let filtrados = this.todasLasTransacciones;

        if (filtroClaveOrig) {
            filtrados = filtrados.filter(log => 
                log.from.includes(filtroClaveOrig) || log.to.includes(filtroClaveOrig)
            );
        }

        if (filtroTipo) {
            filtrados = filtrados.filter(log => log.op === filtroTipo);
        }

        this.renderizarTablaAuditoria(filtrados);
        document.getElementById('totalAuditoria').textContent = filtrados.length;
    }

    cargarListaUsuarios() {
        this.todosLosUsuarios = [
            { curp: 'ABCD123456HDFABC00', name: 'Juan Pérez García', balance: 5000.50, operations: 12, status: 'ACTIVO' },
            { curp: 'WXYZ987654JKLMNO11', name: 'María López González', balance: 3200.00, operations: 8, status: 'ACTIVO' },
            { curp: 'QWER654321ASDFGH22', name: 'Carlos Martínez López', balance: 1500.75, operations: 5, status: 'ACTIVO' },
            { curp: 'TYUI321654ZXCVBN33', name: 'Ana Rodríguez Flores', balance: 8900.25, operations: 20, status: 'ACTIVO' },
            { curp: 'ZXCV456789BNMKLO44', name: 'Roberto Díaz Moreno', balance: 0.00, operations: 0, status: 'INACTIVO' },
        ];

        this.renderizarListaUsuarios(this.todosLosUsuarios);
        document.getElementById('totalUsuarios').textContent = this.todosLosUsuarios.length;
    }

    renderizarListaUsuarios(usuarios) {
        const tbody = document.getElementById('cuerpoTablaUsuarios');
        let html = '';

        usuarios.forEach(usuario => {
            const badgeEstado = usuario.status === 'ACTIVO' ? 'badge-success' : 'badge-secondary';
            
            html += `
                <tr>
                    <td class="ps-4"><small class="text-monospace">${usuario.curp}</small></td>
                    <td>${usuario.name}</td>
                    <td><strong>$${usuario.balance.toFixed(2)}</strong></td>
                    <td class="text-center"><span class="badge bg-light text-dark">${usuario.operations}</span></td>
                    <td><span class="badge ${badgeEstado}">${usuario.status}</span></td>
                    <td class="pe-4">
                        <button class="btn btn-sm btn-outline-primary" onclick="app.mostrarDetalleUsuario('${usuario.curp}')">
                            <i class="bi bi-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    filtrarListaUsuarios() {
        const busquedaClave = document.getElementById('busquedaClaveUsuarios').value.toUpperCase();
        const filtroEstado = document.getElementById('filtroEstadoUsuarios').value;

        let filtrados = this.todosLosUsuarios;

        if (busquedaClave) {
            filtrados = filtrados.filter(usuario => usuario.curp.includes(busquedaClave) || usuario.name.toUpperCase().includes(busquedaClave));
        }

        if (filtroEstado) {
            filtrados = filtrados.filter(usuario => usuario.status === filtroEstado);
        }

        this.renderizarListaUsuarios(filtrados);
        document.getElementById('totalUsuarios').textContent = filtrados.length;
    }

    mostrarDetalleUsuario(curp) {
        const usuario = this.todosLosUsuarios.find(u => u.curp === curp);
        if (!usuario) return;

        document.getElementById('detalleClave').textContent = usuario.curp;
        document.getElementById('detalleNombre').textContent = usuario.name;
        document.getElementById('detalleSaldoBilletera').textContent = `$${usuario.balance.toFixed(2)}`;
        document.getElementById('detalleSaldoBanco').textContent = '$10,000.00';
        document.getElementById('detalleTransacciones').textContent = usuario.operations;

        new bootstrap.Modal(document.getElementById('modalDetalleUsuario')).show();
    }

    // ========== UTILIDADES ==========

    obtenerEncabezadosAutenticacion() {
        const token = localStorage.getItem(this.clavToken);
        return {
            'Autorizacion': `Portador ${token}`,
            'Tipo-Contenido': 'application/json'
        };
    }
}

// Instancia global de la aplicación
const app = new AplicacionFinanciera();
