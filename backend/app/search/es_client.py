from elasticsearch import Elasticsearch
from elasticsearch.exceptions import NotFoundError
from app.core.config import settings

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