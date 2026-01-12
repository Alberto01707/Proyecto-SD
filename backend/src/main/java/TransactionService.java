import com.google.cloud.pubsub.v1.AckReplyConsumer;
import com.google.cloud.pubsub.v1.MessageReceiver;
import com.google.cloud.pubsub.v1.Subscriber;
import com.google.pubsub.v1.ProjectSubscriptionName;
import com.google.pubsub.v1.PubsubMessage;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class TransactionService {

    private static final String PROJECT_ID = "sistema-financiero-2025";
    private static final String SUBSCRIPTION_ID = "transacciones-sub";

    public static void main(String[] args) {
        System.out.println("Iniciando Servicio de Auditoría (Listener Pub/Sub)...");
        subscribeAsync();
    }

    public static void subscribeAsync() {
        ProjectSubscriptionName subscriptionName =
                ProjectSubscriptionName.of(PROJECT_ID, SUBSCRIPTION_ID);

        // Definir qué hacer cuando llega un mensaje
        MessageReceiver receiver =
                (PubsubMessage message, AckReplyConsumer consumer) -> {
                    String json = message.getData().toStringUtf8();
                    System.out.println("Auditoría recibida: " + json);
                    
                    if (guardarEnAuditoria(json)) {
                        consumer.ack(); // Confirmar a Google que ya lo guardamos
                    } else {
                        consumer.nack(); // Si falla la BD, reintentar luego
                    }
                };

        Subscriber subscriber = null;
        try {
            subscriber = Subscriber.newBuilder(subscriptionName, receiver).build();
            subscriber.startAsync().awaitRunning();
            System.out.printf("Escuchando mensajes en %s...\n", subscriptionName.toString());
            // Mantener vivo el servicio
            subscriber.awaitTerminated();
        } catch (IllegalStateException e) {
            System.err.println("Error fatal en suscriptor: " + e.getMessage());
        }
    }

    private static boolean guardarEnAuditoria(String json) {
        // Parseo manual simple usando Regex para no depender de librerías extra aquí
        String origen = extraerValor(json, "origen");
        String destino = extraerValor(json, "destino");
        String montoStr = extraerValor(json, "monto");

        if (origen == null || montoStr == null) return false;

        String query = "INSERT INTO auditoria (origen_curp, destino_curp, monto, status) VALUES (?, ?, ?, 'EXITOSO')";
        
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            
            pstmt.setString(1, origen);
            pstmt.setString(2, destino);
            pstmt.setDouble(3, Double.parseDouble(montoStr));
            pstmt.executeUpdate();
            System.out.println(">> Transacción guardada en BD Auditoría.");
            return true;

        } catch (Exception e) {
            System.err.println("Error guardando auditoría: " + e.getMessage());
            return false;
        }
    }

    private static String extraerValor(String json, String key) {
        Pattern pattern = Pattern.compile("\"" + key + "\":\"?([^\",}]+)\"?");
        Matcher matcher = pattern.matcher(json);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }
}