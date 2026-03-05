import asyncio
import json
from datetime import datetime, timezone

import aio_pika

from app.core.config import settings
from app.search.es_client import index_doctor_document


async def _handle_notification(message: aio_pika.abc.AbstractIncomingMessage):
    async with message.process():
        payload = json.loads(message.body.decode("utf-8"))
        print(f"[Consumer][Notification] İşleniyor: {payload}")


async def _handle_doctor_sync(message: aio_pika.abc.AbstractIncomingMessage):
    async with message.process():
        payload = json.loads(message.body.decode("utf-8"))
        try:
            index_doctor_document(payload)
            print(f"[Consumer][DoctorSync] Elasticsearch senkronlandı: {payload.get('doctor_id')}")
        except Exception as exc:
            print(f"[Consumer][DoctorSync] Elasticsearch hatası: {exc}")


async def start_consumers():
    connection = await aio_pika.connect_robust(
        settings.RABBITMQ_URL,
        client_properties={"connection_name": "mhrs_fastapi_consumer"},
    )

    async with connection:
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=10)

        notification_queue = await channel.declare_queue("send_appointment_notification", durable=True)
        doctor_sync_queue = await channel.declare_queue("sync_doctor_to_es", durable=True)

        await notification_queue.consume(_handle_notification)
        await doctor_sync_queue.consume(_handle_doctor_sync)

        print(f"[Consumer] RabbitMQ consumers aktif. {datetime.now(timezone.utc).isoformat()}")
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(start_consumers())
