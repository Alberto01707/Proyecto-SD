import com.sun.net.httpserver.*;
import java.io.*;
import java.net.InetSocketAddress;
import java.util.concurrent.Executors;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.sql.*;
import java.nio.charset.StandardCharsets;

public class AuthService {

    private static final String SECRET_KEY = "ALB_LECANDA_CONEJO_PROYECTO_SISTEMA_FINANCIERO_2025";
    private static final long EXPIRATION_TIME = 1000 * 60 * 60; // 1 hora

    public static void main(String[] args) throws IOException {
        // Puerto 8081 (Exclusivo para Auth)
        HttpServer server = HttpServer.create(new InetSocketAddress(8081), 0);

        server.createContext("/auth/login", (exchange) -> {
            manejarCORS(exchange); // Habilitar acceso al Frontend
            
            if ("POST".equals(exchange.getRequestMethod())) {
                try {
                    String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                    Map<String, String> data = parseJson(body);
                    
                    String curp = data.get("curp");
                    String password = data.get("password");

                    if (validarCredencialesBD(curp, password)) {
                        String token = generarToken(curp);
                        String jsonResponse = "{\"token\": \"" + token + "\"}";
                        enviarRespuesta(exchange, 200, jsonResponse);
                    } else {
                        enviarRespuesta(exchange, 401, "{\"error\": \"Credenciales incorrectas\"}");
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                    enviarRespuesta(exchange, 500, "{\"error\": \"Error interno\"}");
                }
            } else if (!"OPTIONS".equals(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(405, -1);
            }
        });
		
		server.createContext("/auth/register", (exchange) -> {
			manejarCORS(exchange);

			if ("POST".equals(exchange.getRequestMethod())) {
				try {
					String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
					Map<String, String> data = parseJson(body);

					String curp = data.get("curp");
					String password = data.get("password");
					String nombre = data.getOrDefault("nombre", curp);
					String email = data.getOrDefault("email", "");

					if (curp == null || password == null) {
						enviarRespuesta(exchange, 400, "{\"error\":\"Datos incompletos\"}");
						return;
					}

					try (Connection conn = DatabaseConnection.getConnection()) {
						// Insertar usuario
						PreparedStatement psUser = conn.prepareStatement(
							"INSERT INTO usuarios (curp, nombre, password_hash, email) VALUES (?, ?, ?, ?)"
						);
						psUser.setString(1, curp);
						psUser.setString(2, nombre);
						psUser.setString(3, password);
						psUser.setString(4, email);
						psUser.executeUpdate();

						// Crear cuenta con saldo 0
						PreparedStatement psCuenta = conn.prepareStatement(
							"INSERT INTO cuentas (curp_usuario, saldo) VALUES (?, 0)"
						);
						psCuenta.setString(1, curp);
						psCuenta.executeUpdate();

						enviarRespuesta(exchange, 201, "{\"mensaje\":\"Usuario registrado correctamente\"}");
					}

				} catch (SQLException e) {
					enviarRespuesta(exchange, 409, "{\"error\":\"Usuario ya existe\"}");
				} catch (Exception e) {
					enviarRespuesta(exchange, 500, "{\"error\":\"Error interno\"}");
				}
			}
		});

        server.setExecutor(Executors.newFixedThreadPool(8));
        server.start();
        System.out.println("AuthService corriendo en el puerto 8081 (Conectado a Cloud SQL)...");
    }

    private static boolean validarCredencialesBD(String curp, String password) {
        String query = "SELECT password_hash FROM usuarios WHERE curp = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            pstmt.setString(1, curp);
            ResultSet rs = pstmt.executeQuery();
            if (rs.next()) {
            
                return rs.getString("password_hash").equals(password);
            }
        } catch (SQLException e) {
            System.err.println("Error DB: " + e.getMessage());
        }
        return false;
    }

    private static String generarToken(String curp) {
        return Jwts.builder()
                .setSubject(curp)
                .claim("rol", "USUARIO")
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(Keys.hmacShaKeyFor(SECRET_KEY.getBytes()), SignatureAlgorithm.HS256)
                .compact();
    }

    private static void manejarCORS(HttpExchange exchange) throws IOException {
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type, Authorization");
        if ("OPTIONS".equals(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
        }
    }

    private static void enviarRespuesta(HttpExchange exchange, int codigo, String respuesta) throws IOException {
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        byte[] bytes = respuesta.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(codigo, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) { os.write(bytes); }
    }

    private static Map<String, String> parseJson(String json) {
        Map<String, String> map = new HashMap<>();
        json = json.trim().replace("{", "").replace("}", "").replace("\"", "");
        String[] pairs = json.split(",");
        for (String pair : pairs) {
            String[] keyValue = pair.split(":");
            if (keyValue.length >= 2) map.put(keyValue[0].trim(), keyValue[1].trim());
        }
        return map;
    }
	
}
