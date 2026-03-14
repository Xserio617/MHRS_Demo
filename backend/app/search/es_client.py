from elasticsearch import Elasticsearch
from elasticsearch.exceptions import NotFoundError
from app.core.config import settings
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select

from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.hospital import Clinic

# Senkron ES istemcisi (FastAPI threadpool ile sorunsuz çalışır)
es_client = Elasticsearch(settings.ELASTICSEARCH_URL, request_timeout=5)

def create_doctor_index() -> None:
    """
    Doktorlar için arama indeksini (tablosunu) oluşturur.
    Eğer indeks zaten varsa dokunmaz.
    """
    index_name = "doctors_index"
    
    # İndeks ayarları ve Mapping (Şema)
    # MariaDB'deki o karmaşık çoka-çok ilişkiyi burada düz bir JSON'a (Denormalization) çeviriyoruz.
    mapping = {
        "settings": {
            "analysis": {
                "analyzer": {
                    "turkish_analyzer": {
                        "type": "custom",
                        "tokenizer": "standard",
                        "filter": ["lowercase", "turkish_stop", "apostrophe"]
                    }
                },
                "filter": {
                    "turkish_stop": {
                        "type": "stop",
                        "stopwords": "_turkish_"
                    }
                }
            }
        },
        "mappings": {
            "properties": {
                "doctor_id": {"type": "integer"},
                "full_name": {
                    "type": "text", 
                    "analyzer": "turkish_analyzer"
                },
                "title": {"type": "keyword"}, # Keyword tam eşleşme arar (Örn: Prof. Dr.)
                
                # Doktorun çalıştığı klinikler ve hastaneler liste olarak tutulacak
                "clinics": {"type": "keyword"}, 
                "hospitals": {"type": "keyword"},
                "cities": {"type": "keyword"}
            }
        }
    }

    # İndeks yoksa oluştur
    exists = es_client.indices.exists(index=index_name)
    if not exists:
        es_client.indices.create(index=index_name, body=mapping)


def index_doctor_document(doctor_data: dict) -> None:
    """
    MariaDB'ye yeni bir doktor eklendiğinde veya güncellendiğinde, 
    o doktorun verisini Elasticsearch'e kaydeder.
    """
    es_client.index(
        index="doctors_index",
        id=str(doctor_data["doctor_id"]), # ES belge ID'si ile MariaDB ID'sini aynı tutuyoruz
        document=doctor_data
    )

def search_doctors_in_es(query: str) -> list[dict]:
    """
    Kullanıcının girdiği kelimeye göre doktor, klinik veya hastane araması yapar.
    """
    search_body = {
        "query": {
            "multi_match": {
                "query": query,
                # Nerelerde arama yapacak? İsimde ararken yazım hatalarını tolere et (fuzziness)
                "fields": ["full_name^3", "clinics^2", "hospitals", "cities"],
                "fuzziness": "AUTO" 
            }
        }
    }
    
    try:
        response = es_client.search(index="doctors_index", body=search_body)
    except NotFoundError:
        create_doctor_index()
        response = es_client.search(index="doctors_index", body=search_body)
    
    # Sadece bize lazım olan verileri (_source) temiz bir liste olarak döndür
    hits = response.get("hits", {}).get("hits", [])
    return [hit["_source"] for hit in hits]


def remove_doctor_document(doctor_id: int) -> None:
    try:
        es_client.delete(index="doctors_index", id=str(doctor_id))
    except NotFoundError:
        return


def create_appointment_index() -> None:
    index_name = "appointments_index"
    mapping = {
        "mappings": {
            "properties": {
                "appointment_uid": {"type": "keyword"},
                "patient_id": {"type": "integer"},
                "doctor_id": {"type": "integer"},
                "doctor_full_name": {"type": "text"},
                "hospital_name": {"type": "keyword"},
                "clinic_name": {"type": "keyword"},
                "appointment_date": {"type": "date"},
                "status": {"type": "keyword"},
            }
        }
    }

    exists = es_client.indices.exists(index=index_name)
    if not exists:
        es_client.indices.create(index=index_name, body=mapping)


def index_appointment_document(appointment_data: dict) -> None:
    es_client.index(
        index="appointments_index",
        id=str(appointment_data["appointment_uid"]),
        document=appointment_data,
    )


def search_patient_appointments_in_es(patient_id: int) -> list[dict]:
    search_body = {
        "size": 200,
        "sort": [{"appointment_date": {"order": "desc"}}],
        "query": {
            "bool": {
                "filter": [
                    {"term": {"patient_id": patient_id}},
                ]
            }
        },
    }

    try:
        response = es_client.search(index="appointments_index", body=search_body)
    except NotFoundError:
        create_appointment_index()
        response = es_client.search(index="appointments_index", body=search_body)

    hits = response.get("hits", {}).get("hits", [])
    return [hit["_source"] for hit in hits]


def build_appointment_document(appointment: Appointment) -> dict:
    doctor_name = "Bilinmiyor"
    clinic_name = "Bilinmiyor"
    hospital_name = "Bilinmiyor"

    if appointment.doctor is not None:
        doctor_name = f"{appointment.doctor.first_name} {appointment.doctor.last_name}".strip()
        if appointment.doctor.clinic is not None:
            clinic_name = appointment.doctor.clinic.name
            if appointment.doctor.clinic.hospital is not None:
                hospital_name = appointment.doctor.clinic.hospital.name

    return {
        "appointment_uid": str(appointment.uid),
        "patient_id": appointment.patient_id,
        "doctor_id": appointment.doctor_id,
        "doctor_full_name": doctor_name,
        "hospital_name": hospital_name,
        "clinic_name": clinic_name,
        "appointment_date": appointment.appointment_date.isoformat(),
        "status": str(appointment.status.value if hasattr(appointment.status, "value") else appointment.status),
    }


def sync_all_appointments_to_es(db: Session) -> None:
    create_appointment_index()

    stmt = (
        select(Appointment)
        .options(
            joinedload(Appointment.doctor)
            .joinedload(Doctor.clinic)
            .joinedload(Clinic.hospital)
        )
        .order_by(Appointment.id.asc())
    )
    appointments = db.execute(stmt).scalars().all()

    for appointment in appointments:
        document = build_appointment_document(appointment)
        index_appointment_document(document)