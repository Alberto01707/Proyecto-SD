import com.sun.net.httpserver.*;
import java.io.*;
import java.net.InetSocketAddress;
import java.util.*;
import java.sql.*;
import java.nio.charset.StandardCharsets;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;

import com.google.cloud.pubsub.v1.Publisher;
import com.google.protobuf.ByteString;
import com.google.pubsub.v1.PubsubMessage;
import com.google.pubsub.v1.TopicName;

/**
 * =============================================================================
 *  CONTADOR GLOBAL DE TRANSACCIONES (Para MonitorLanterna)
 * =============================================================================
 */
class ContadorTransacciones {
    private static long total = 0;

    public static synchronized void incrementar() {
        total++;
    }

    public static synchronized long getTotal() {
        return total;
    }
}

/**
 * =============================================================================
 *  ACCOUNT SERVICE
 * =============================================================================
 */
public class AccountService {

    private static final String SECRET_KEY =
            "ALB_LECANDA_CONEJO_PROYECTO_SISTEMA_FINANCIERO_2025";

    private static final String PROJECT_ID = "sistema-financiero-2025";
    private static final String TOPIC_ID = "transacciones-topic";


    public static void main(String[] args) throws IOException {

        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);

        // =====================================================================
        // ENDPOINTS
        // =====================================================================

        server.createContext("/cuenta/deposito", exchange -> {
            manejarCORS(exchange);

            if ("OPTIONS".equals(exchange.getRequestMethod())) return;

            if ("POST".equals(exchange.getRequestMethod())) {
                handleDeposito(exchange);
                ContadorTransacciones.incrementar();
            } else {
                enviarRespuesta(exchange, 405, "{\"error\":\"Método no permitido\"}");
            }
        });

        server.createContext("/cuenta/retiro", exchange -> {
            manejarCORS(exchange);

            if ("OPTIONS".equals(exchange.getRequestMethod())) return;

            if ("POST".equals(exchange.getRequestMethod())) {
                handleRetiro(exchange);
                ContadorTransacciones.incrementar();
            } else {
                enviarRespuesta(exchange, 405, "{\"error\":\"Método no permitido\"}");
            }
        });

        server.createContext("/transferir", exchange -> {
            manejarCORS(exchange);

            if ("OPTIONS".equals(exchange.getRequestMethod())) return;

            if ("POST".equals(exchange.getRequestMethod())) {
                handleTransfer(exchange);
                ContadorTransacciones.incrementar();
            } else {
                enviarRespuesta(exchange, 405, "{\"error\":\"Método no permitido\"}");
            }
        });

        server.createContext("/cuenta/saldo", exchange -> {
            manejarCORS(exchange);

            if ("OPTIONS".equals(exchange.getRequestMethod())) return;

            if ("GET".equals(exchange.getRequestMethod())) {
                handleBalance(exchange);
            } else {
                enviarRespuesta(exchange, 405, "{\"error\":\"Método no permitido\"}");
            }
        });

        server.createContext("/cuenta/historial", exchange -> {
            manejarCORS(exchange);

            if ("OPTIONS".equals(exchange.getRequestMethod())) return;

            if ("GET".equals(exchange.getRequestMethod())) {
                handleHistorial(exchange);
            } else {
                enviarRespuesta(exchange, 405, "{\"error\":\"Método no permitido\"}");
            }
        });

        /**
         * ======================= ENDPOINT MONITOR ============================
         */
        server.createContext("/monitor", exchange -> {
            manejarCORS(exchange);

            if ("OPTIONS".equals(exchange.getRequestMethod())) return;

            String json = "{"
                    + "\"ip\":\"" + exchange.getLocalAddress().getHostString() + "\","
                    + "\"cpu\":" + obtenerUsoCPU() + ","
                    + "\"transacciones\":" + ContadorTransacciones.getTotal()
                    + "}";

            enviarRespuesta(exchange, 200, json);
        });

        // =====================================================================

        server.setExecutor(java.util.concurrent.Executors.newFixedThreadPool(10));
        server.start();
        System.out.println(">>> AccountService activo en puerto 8080");
    }


    // =====================================================================
    // HANDLERS DE LÓGICA
    // =====================================================================

    private static void handleHistorial(HttpExchange exchange) throws IOException {
        try {
            String token = extraerToken(exchange);
            String curp = validarToken(token);

            String query =
                    "SELECT fecha, origen_curp, destino_curp, monto FROM auditoria "
                    + "WHERE origen_curp = ? OR destino_curp = ? ORDER BY fecha DESC";

            try (Connection conn = DatabaseConnection.getConnection();
                 PreparedStatement ps = conn.prepareStatement(query)) {

                ps.setString(1, curp);
                ps.setString(2, curp);

                ResultSet rs = ps.executeQuery();

                StringBuilder json = new StringBuilder("[");
                boolean primero = true;

                while (rs.next()) {
                    if (!primero) json.append(",");
                    primero = false;

                    String origen = rs.getString("origen_curp");
                    String destino = rs.getString("destino_curp");
                    double monto = rs.getDouble("monto");
                    String fecha = rs.getString("fecha");

                    String tipo;
                    if (origen.equals("SISTEMA")) tipo = "DEPOSITO";
                    else if (destino.equals("EFECTIVO")) tipo = "RETIRO";
                    else if (origen.equals(curp)) tipo = "TRANSFERENCIA_SALIENTE";
                    else tipo = "TRANSFERENCIA_ENTRANTE";

                    json.append("{")
                            .append("\"fecha\":\"").append(fecha).append("\",")
                            .append("\"tipo\":\"").append(tipo).append("\",")
                            .append("\"origen\":\"").append(origen).append("\",")
                            .append("\"destino\":\"").append(destino).append("\",")
                            .append("\"monto\":").append(monto)
                            .append("}");
                }

                json.append("]");

                enviarRespuesta(exchange, 200, json.toString());
            }

        } catch (Exception e) {
            enviarRespuesta(exchange, 500, "{\"error\":\"Error al obtener historial\"}");
        }
    }


    private static void handleTransfer(HttpExchange exchange) throws IOException {

        Connection conn = null;

        try {
            String token = extraerToken(exchange);
            String curpOrigen = validarToken(token);

            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            Map<String, String> data = parseJson(body);

            String curpDestino = data.get("curp_destino");
            double monto = Double.parseDouble(data.get("monto"));

            conn = DatabaseConnection.getConnection();
            conn.setAutoCommit(false);

            double saldoActual = obtenerSaldo(conn, curpOrigen);
            if (saldoActual < monto) {
                enviarRespuesta(exchange, 400, "{\"error\":\"Saldo insuficiente\"}");
                return;
            }

            actualizarSaldo(conn, curpOrigen, -monto);
            actualizarSaldo(conn, curpDestino, monto);

            conn.commit();

            publicarEventoPubSub(curpOrigen, curpDestino, monto);

            enviarRespuesta(exchange, 200, "{\"mensaje\":\"Transferencia exitosa\"}");

        } catch (Exception e) {
            try { if (conn != null) conn.rollback(); } catch (SQLException ignored) {}
            enviarRespuesta(exchange, 500, "{\"error\":\"Error interno en transferencia\"}");
        } finally {
            try { if (conn != null) conn.close(); } catch (SQLException ignored) {}
        }
    }


    private static void handleBalance(HttpExchange exchange) throws IOException {

        try {
            String token = extraerToken(exchange);
            String curp = validarToken(token);

            try (Connection conn = DatabaseConnection.getConnection()) {
                double saldo = obtenerSaldo(conn, curp);
                enviarRespuesta(exchange, 200, "{\"saldo_monedero\":" + saldo + "}");
            }

        } catch (Exception e) {
            enviarRespuesta(exchange, 500, "{\"error\":\"Error al obtener saldo\"}");
        }
    }


    private static void handleDeposito(HttpExchange exchange) throws IOException {

        Connection conn = null;

        try {
            String token = extraerToken(exchange);
            String curp = validarToken(token);

            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            Map<String, String> data = parseJson(body);

            double monto = Double.parseDouble(data.get("monto"));
            if (monto <= 0) {
                enviarRespuesta(exchange, 400, "{\"error\":\"Monto inválido\"}");
                return;
            }

            conn = DatabaseConnection.getConnection();
            actualizarSaldo(conn, curp, monto);

            publicarEventoPubSub("SISTEMA", curp, monto);

            enviarRespuesta(exchange, 200, "{\"mensaje\":\"Depósito exitoso\"}");

        } catch (Exception e) {
            enviarRespuesta(exchange, 500, "{\"error\":\"Error interno en depósito\"}");
        } finally {
            try { if (conn != null) conn.close(); } catch (SQLException ignored) {}
        }
    }


    private static void handleRetiro(HttpExchange exchange) throws IOException {

        Connection conn = null;

        try {
            String token = extraerToken(exchange);
            String curp = validarToken(token);

            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            Map<String, String> data = parseJson(body);

            double monto = Double.parseDouble(data.get("monto"));
            if (monto <= 0) {
                enviarRespuesta(exchange, 400, "{\"error\":\"Monto inválido\"}");
                return;
            }

            conn = DatabaseConnection.getConnection();

            double saldo = obtenerSaldo(conn, curp);
            if (saldo < monto) {
                enviarRespuesta(exchange, 400, "{\"error\":\"Saldo insuficiente\"}");
                return;
            }

            actualizarSaldo(conn, curp, -monto);

            publicarEventoPubSub(curp, "EFECTIVO", monto);

            enviarRespuesta(exchange, 200, "{\"mensaje\":\"Retiro exitoso\"}");

        } catch (Exception e) {
            enviarRespuesta(exchange, 500, "{\"error\":\"Error interno en retiro\"}");
        } finally {
            try { if (conn != null) conn.close(); } catch (SQLException ignored) {}
        }

    }


    // =====================================================================
    // BASE DE DATOS
    // =====================================================================

    private static double obtenerSaldo(Connection conn, String curp) throws SQLException {
        PreparedStatement ps = conn.prepareStatement(
                "SELECT saldo FROM cuentas WHERE curp_usuario = ?");
        ps.setString(1, curp);

        ResultSet rs = ps.executeQuery();
        return rs.next() ? rs.getDouble("saldo") : 0.0;
    }

    private static void actualizarSaldo(Connection conn, String curp, double cambio) throws SQLException {
        PreparedStatement ps = conn.prepareStatement(
                "UPDATE cuentas SET saldo = saldo + ? WHERE curp_usuario = ?");
        ps.setDouble(1, cambio);
        ps.setString(2, curp);

        int rows = ps.executeUpdate();
        if (rows == 0) throw new SQLException("Cuenta no encontrada: " + curp);
    }


    // =====================================================================
    // PUB/SUB
    // =====================================================================

    private static void publicarEventoPubSub(String origen, String destino, double monto) {
        try {
            TopicName topicName = TopicName.of(PROJECT_ID, TOPIC_ID);
            Publisher publisher = Publisher.newBuilder(topicName).build();

            String mensaje = String.format(
                    "{\"origen\":\"%s\", \"destino\":\"%s\", \"monto\":%.2f}",
                    origen, destino, monto);

            PubsubMessage pubsubMessage =
                    PubsubMessage.newBuilder()
                            .setData(ByteString.copyFromUtf8(mensaje))
                            .build();

            publisher.publish(pubsubMessage);
            publisher.shutdown();

        } catch (Exception e) {
            System.err.println("Error PubSub: " + e.getMessage());
        }
    }


    // =====================================================================
    // CORS
    // =====================================================================

    private static void manejarCORS(HttpExchange exchange) throws IOException {
        Headers headers = exchange.getResponseHeaders();

        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

        if ("OPTIONS".equals(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
        }
    }


    // =====================================================================
    // UTILIDADES / AUXILIARES
    // =====================================================================

    private static String extraerToken(HttpExchange exchange) {
        String auth = exchange.getRequestHeaders().getFirst("Authorization");
        if (auth != null && auth.startsWith("Bearer ")) return auth.substring(7);
        return "";
    }

    private static String validarToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(Keys.hmacShaKeyFor(SECRET_KEY.getBytes()))
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    private static void enviarRespuesta(HttpExchange exchange, int codigo, String json)
            throws IOException {

        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");

        exchange.sendResponseHeaders(codigo, bytes.length);
        OutputStream os = exchange.getResponseBody();
        os.write(bytes);
        os.close();
    }

    private static Map<String, String> parseJson(String json) {
        Map<String, String> map = new HashMap<>();

        String clean = json.trim()
                .replace("{", "")
                .replace("}", "")
                .replace("\"", "");

        for (String pair : clean.split(",")) {
            String[] kv = pair.split(":");
            if (kv.length >= 2) {
                map.put(kv[0].trim(), kv[1].trim());
            }
        }

        return map;
    }

    private static double obtenerUsoCPU() {
        com.sun.management.OperatingSystemMXBean os =
                (com.sun.management.OperatingSystemMXBean)
                        java.lang.management.ManagementFactory.getOperatingSystemMXBean();

        return os.getSystemCpuLoad() * 100;
    }

}
