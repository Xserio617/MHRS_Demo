import json
import aio_pika
from app.core.config import settings

# Global bağlantı havuzu (Sürekli aç-kapat yapmamak için)
rabbitmq_connection = None

async def get_rabbitmq_connection() -> aio_pika.Connection:
    """RabbitMQ'ya asenkron bağlantı sağlar veya mevcut bağlantıyı döndürür."""
    global rabbitmq_connection
    if rabbitmq_connection is None or rabbitmq_connection.is_closed:
        rabbitmq_connection = await aio_pika.connect_robust(
            settings.RABBITMQ_URL,
            # Bağlantı koparsa otomatik tekrar dener
            client_properties={"connection_name": "mhrs_fastapi_producer"}
        )
    return rabbitmq_connection

async def publish_message(queue_name: str, message: dict):
    """
    Belirtilen kuyruğa (queue) JSON formatında bir mesaj fırlatır.
    Örn: queue_name="sync_doctor_to_es", message={"doctor_id": 5, ...}
    """
    connection = await get_rabbitmq_connection()
    
    # Her işlem için bir kanal (channel) açılır
    async with connection.channel() as channel:
        # Kuyruğun var olduğundan emin ol (Yoksa oluşturur, durable=True ise sunucu kapansa bile mesaj silinmez)
        queue = await channel.declare_queue(queue_name, durable=True)
        
        # Pydantic'ten veya Dictionary'den gelen veriyi JSON string'e çeviriyoruz
        message_body = json.dumps(message).encode("utf-8")
        
        # Mesajı kuyruğa fırlat
        await channel.default_exchange.publish(
            aio_pika.Message(
                body=message_body,
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT # Mesajın diske yazılmasını garanti eder
            ),
            routing_key=queue_name,
        )
        print(f"[RabbitMQ] '{queue_name}' kuyruğuna mesaj bırakıldı: {message}")