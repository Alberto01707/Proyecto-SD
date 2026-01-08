// Función para realizar transferencias
function realizarTransferencia() {
    const destino = document.getElementById('curp_destino').value;
    const monto = document.getElementById('monto').value;
    const token = localStorage.getItem('jwt_token'); // Recuperar token del Requisito 2

    const data = {
        curp_destino: destino,
        monto: monto
    };

    fetch('http://IP_ACCOUNT_SERVICE:8080/transferir', {
        method: 'POST',
        headers: {
            'Tipo-Contenido': 'application/json',
            'Autorizacion': 'Portador ' + token // Enviar JWT firmado
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(res => {
        alert("Operación: " + res.mensaje);
        actualizarSaldosVisuales(); // Requisito 36
    })
    .catch(error => console.error('Error:', error));
}

// Función auxiliar para actualizar saldos en la interfaz
function actualizarSaldosVisuales() {
    const token = localStorage.getItem('jwt_token');
    
    // Obtener saldo actualizado del usuario
    fetch('http://IP_ACCOUNT_SERVICE:8080/saldo', {
        method: 'GET',
        headers: {
            'Autorizacion': 'Portador ' + token
        }
    })
    .then(response => response.json())
    .then(data => {
        // Actualizar el elemento de saldo en la UI
        const saldoElement = document.getElementById('userBalance');
        if (saldoElement) {
            saldoElement.textContent = `$${data.saldo_monedero.toFixed(2)} MXN`;
        }
    })
    .catch(error => console.error('Error al actualizar saldo:', error));
}
