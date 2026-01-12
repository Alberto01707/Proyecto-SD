import com.sun.net.httpserver.*;
import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;

public class AdminService {

    private static final String SECRET_KEY =
        "ALB_LECANDA_CONEJO_PROYECTO_SISTEMA_FINANCIERO_2025";

    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(8090), 0);

        server.createContext("/admin/dashboard", AdminService::dashboard);
        server.createContext("/admin/auditoria", AdminService::auditoria);
        server.createContext("/admin/usuarios", AdminService::usuarios);

        server.start();
        System.out.println("AdminService activo en 8090");
    }

    // ===== ENDPOINTS =====

    private static void dashboard(HttpExchange ex) throws IOException {
        if (!esAdmin(ex)) return;

        try (Connection c = DatabaseConnection.getConnection()) {
            double dinero = queryDouble(c, "SELECT SUM(saldo) FROM cuentas");
            int usuarios = queryInt(c, "SELECT COUNT(*) FROM usuarios");
            int tx = queryInt(c, "SELECT COUNT(*) FROM auditoria");

            enviar(ex, 200, String.format(
                "{\"dinero\":%.2f,\"usuarios\":%d,\"transacciones\":%d}",
                dinero, usuarios, tx
            ));
        } catch (SQLException e) {
            enviar(ex, 500, "{}");
        }
    }

    private static void auditoria(HttpExchange ex) throws IOException {
        if (!esAdmin(ex)) return;

        try (Connection c = DatabaseConnection.getConnection()) {
            ResultSet rs = c.createStatement().executeQuery(
                "SELECT timestamp, origen, destino, tipo, monto, estado FROM auditoria ORDER BY timestamp DESC LIMIT 100"
            );

            StringBuilder json = new StringBuilder("[");
            while (rs.next()) {
                json.append(String.format(
                    "{\"t\":\"%s\",\"o\":\"%s\",\"d\":\"%s\",\"op\":\"%s\",\"m\":%.2f,\"e\":\"%s\"},",
                    rs.getTimestamp(1), rs.getString(2), rs.getString(3),
                    rs.getString(4), rs.getDouble(5), rs.getString(6)
                ));
            }
            if (json.charAt(json.length()-1)==',') json.deleteCharAt(json.length()-1);
            json.append("]");

            enviar(ex, 200, json.toString());
        } catch (SQLException e) {
            enviar(ex, 500, "[]");
        }
    }

    private static void usuarios(HttpExchange ex) throws IOException {
        if (!esAdmin(ex)) return;

        try (Connection c = DatabaseConnection.getConnection()) {
            ResultSet rs = c.createStatement().executeQuery(
                "SELECT u.curp, u.nombre, c.saldo, u.estado FROM usuarios u JOIN cuentas c ON u.curp=c.curp_usuario"
            );

            StringBuilder json = new StringBuilder("[");
            while (rs.next()) {
                json.append(String.format(
                    "{\"curp\":\"%s\",\"nombre\":\"%s\",\"saldo\":%.2f,\"estado\":\"%s\"},",
                    rs.getString(1), rs.getString(2), rs.getDouble(3), rs.getString(4)
                ));
            }
            if (json.charAt(json.length()-1)==',') json.deleteCharAt(json.length()-1);
            json.append("]");

            enviar(ex, 200, json.toString());
        } catch (SQLException e) {
            enviar(ex, 500, "[]");
        }
    }

    // ===== SEGURIDAD =====

    private static boolean esAdmin(HttpExchange ex) throws IOException {
        try {
            String auth = ex.getRequestHeaders().getFirst("Authorization");
            if (auth == null) throw new Exception();
            String token = auth.substring(7);

            Claims c = Jwts.parserBuilder()
                    .setSigningKey(Keys.hmacShaKeyFor(SECRET_KEY.getBytes()))
                    .build()
                    .parseClaimsJws(token).getBody();

            // Verificar Ãºnicamente por CURP: aceptar solo si el subject empieza por 'ADMIN'
            String subject = c.getSubject();
            if (subject != null && subject.startsWith("ADMIN")) {
                return true;
            }

            throw new Exception();

        } catch (Exception e) {
            enviar(ex, 403, "{\"error\":\"Acceso denegado\"}");
            return false;
        }
    }

    // ===== UTIL =====

    private static void enviar(HttpExchange ex, int code, String json) throws IOException {
        byte[] b = json.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().add("Content-Type", "application/json");
        ex.sendResponseHeaders(code, b.length);
        ex.getResponseBody().write(b);
        ex.close();
    }

    private static double queryDouble(Connection c, String q) throws SQLException {
        ResultSet r = c.createStatement().executeQuery(q);
        return r.next() ? r.getDouble(1) : 0;
    }

    private static int queryInt(Connection c, String q) throws SQLException {
        ResultSet r = c.createStatement().executeQuery(q);
        return r.next() ? r.getInt(1) : 0;
    }
}
