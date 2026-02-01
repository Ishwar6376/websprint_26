import amqp from "amqplib"
import { clients } from "../../app.js"

export async function startWorker() {
    const RABBIT_URL = process.env.RABBIT_URL;
    const queue = 'notifications_queue';

    async function connect() {
        try {
            // 1. Add heartbeat to prevent ECONNRESET on idle connections
            const connection = await amqp.connect(`${RABBIT_URL}?heartbeat=60`);
            
            // Handle Connection level events
            connection.on("error", (err) => {
                console.error("[AMQP] Connection error:", err.message);
            });

            connection.on("close", () => {
                console.warn("[AMQP] Connection closed. Retrying in 5s...");
                return setTimeout(connect, 5000);
            });

            const channel = await connection.createChannel();
            
            // Handle Channel level events
            channel.on("error", (err) => {
                console.error("[AMQP] Channel error:", err.message);
            });

            await channel.assertQueue(queue, { durable: false });
            console.log(`[*] Worker connected to RabbitMQ. Waiting for messages...`);

            channel.consume(queue, (msg) => {
                if (msg !== null) {
                    try {
                        const content = JSON.parse(msg.content.toString());
                        const targetUserId = content.userId;

                        // Check if the user is currently connected via SSE
                        if (clients[targetUserId]) {
                            console.log(`[SSE] Pushing notification to user: ${targetUserId}`);
                            clients[targetUserId].write(`data: ${JSON.stringify(content)}\n\n`);
                        } else {
                            console.log(`[SSE] User ${targetUserId} not online. Message acknowledged.`);
                        }

                        channel.ack(msg);
                    } catch (parseError) {
                        console.error("Error processing message:", parseError);
                        channel.nack(msg, false, false); // Drop malformed messages
                    }
                }
            });

        } catch (error) {
            console.error("[AMQP] Connection Failed:", error.message);
            console.log("Retrying connection in 5s...");
            return setTimeout(connect, 5000);
        }
    }

    // Initialize first connection
    await connect();
}