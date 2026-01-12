import com.google.cloud.pubsub.v1.AckReplyConsumer;
import com.google.cloud.pubsub.v1.MessageReceiver;
import com.google.cloud.pubsub.v1.Subscriber;
import com.google.pubsub.v1.ProjectSubscriptionName;
import com.google.pubsub.v1.PubsubMessage;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class TransactionService {

    private static final String PROJECT_ID = "sistema-financiero-2025";
    private static final String SUBSCRIPTION_ID = "transacciones-sub";

    public static void main(String[] args) {
        System.out.println("Iniciando Servicio de Auditoría...");
        subscribeAsync();
    }

    public static void subscribeAsync() {
        ProjectSubscriptionName subscriptionName =
                ProjectSubscriptionName.of(PROJECT_ID, SUBSCRIPTION_ID);

        MessageReceiver receiver = (PubsubMessage message, AckReplyConsumer consumer) -> {

            String json = message.getData().toStringUtf8();
            System.out.println("Auditoría recibida: " + json);

            if (guardarEnAuditoria(json)) {
                consumer.ack();
            } else {
                consumer.nack();
            }

        };

        Subscriber subscriber = Subscriber.newBuilder(subscriptionName, receiver).build();
        subscriber.startAsync().awaitRunning();
        System.out.println("Escuchando mensajes...");
        subscriber.awaitTerminated();
    }

    private static boolean guardarEnAuditoria(String json) {
        try {
            String origen = extraer(json, "origen");
            String destino = extraer(json, "destino");
            String monto = extraer(json, "monto");

            String sql = "INSERT INTO auditoria (origen_curp, destino_curp, monto, status) " +
                         "VALUES (?, ?, ?, 'EXITOSO')";

            try (Connection conn = DatabaseConnection.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {

                ps.setString(1, origen);
                ps.setString(2, destino);
                ps.setDouble(3, Double.parseDouble(monto));

                ps.executeUpdate();
                System.out.println(">> Transacción guardada.");
            }

            return true;

        } catch (Exception e) {
            System.err.println("Error guardando auditoría: " + e.getMessage());
            return false;
        }
    }

    private static String extraer(String json, String key) {
        Pattern p = Pattern.compile("\"" + key + "\"\\s*:\\s*\"?([^\",}]+)\"?");
        Matcher m = p.matcher(json);
        return m.find() ? m.group(1) : null;
    }
}
