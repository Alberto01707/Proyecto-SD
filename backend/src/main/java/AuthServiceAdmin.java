import com.sun.net.httpserver.*;
import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.util.*;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;

public class AuthServiceAdmin {

    private static final String SECRET_KEY =
        "ALB_LECANDA_CONEJO_PROYECTO_SISTEMA_FINANCIERO_2025";

    public static void main(String[] args) throws Exception {
    HttpServer server = HttpServer.create(new InetSocketAddress(8081), 0);

    // Registrar el handler de login admin en esta clase (no en AuthService)
    server.createContext("/auth/admin/login", AuthServiceAdmin::loginAdmin);

        server.setExecutor(null);
        server.start();
        System.out.println(">>> AuthService ADMIN activo en puerto 8081");
    }

    // =========================================================
    // LOGIN ADMIN
    // =========================================================
    private static void loginAdmin(HttpExchange exchange) throws IOException {
        manejarCORS(exchange);
        if (!"POST".equals(exchange.getRequestMethod())) return;

        try {
            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            Map<String, String> data = parseJson(body);

            String curp = data.get("curp");
            String password = data.get("password");

            if (curp == null || password == null) {
                enviar(exchange, 400, "{\"error\":\"Datos incompletos\"}");
                return;
            }

            // Regla ADMIN por CURP
            if (!curp.startsWith("ADMIN")) {
                enviar(exchange, 403, "{\"error\":\"No es administrador\"}");
                return;
            }

            // Evitar text blocks para compatibilidad con niveles más antiguos de Java
            String sql = "SELECT curp FROM usuarios WHERE curp = ? AND password_hash = ?";

            try (Connection conn = DatabaseConnection.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {

                ps.setString(1, curp);
                ps.setString(2, password);

                ResultSet rs = ps.executeQuery();
                if (!rs.next()) {
                    enviar(exchange, 401, "{\"error\":\"Credenciales inválidas\"}");
                    return;
                }
            }

            String token = generarJWT(curp);
            enviar(exchange, 200, "{\"token\":\"" + token + "\"}");

        } catch (Exception e) {
            enviar(exchange, 500, "{\"error\":\"Error interno login admin\"}");
        }
    }

    // =========================================================
    // JWT
    // =========================================================
    private static String generarJWT(String curp) {
        return Jwts.builder()
                .setSubject(curp)
                .setIssuedAt(new java.util.Date())
                .setExpiration(new java.util.Date(System.currentTimeMillis() + 3600000))
                .signWith(
                    Keys.hmacShaKeyFor(SECRET_KEY.getBytes()),
                    SignatureAlgorithm.HS256
                )
                .compact();
    }

    // =========================================================
    // UTILIDADES
    // =========================================================
    private static void manejarCORS(HttpExchange ex) throws IOException {
        ex.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        ex.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type, Authorization");
        ex.getResponseHeaders().add("Access-Control-Allow-Methods", "POST, OPTIONS");
        if ("OPTIONS".equals(ex.getRequestMethod())) {
            ex.sendResponseHeaders(204, -1);
        }
    }

    private static void enviar(HttpExchange ex, int code, String json) throws IOException {
        byte[] out = json.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().add("Content-Type", "application/json");
        ex.sendResponseHeaders(code, out.length);
        ex.getResponseBody().write(out);
        ex.close();
    }

    private static Map<String, String> parseJson(String json) {
        Map<String, String> map = new HashMap<>();
        json = json.trim().replace("{", "").replace("}", "").replace("\"", "");
        for (String pair : json.split(",")) {
            String[] kv = pair.split(":");
            if (kv.length == 2) map.put(kv[0].trim(), kv[1].trim());
        }
        return map;
    }
}
