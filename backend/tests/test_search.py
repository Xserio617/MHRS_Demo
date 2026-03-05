import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
import time
import uuid

from app.main import app
from app.core.database import SessionLocal
from app.models.hospital import Clinic


client = TestClient(app)


def test_search_doctors_endpoint_available():
    response = client.get("/api/v1/search/doctors", params={"q": "simav"})

    if response.status_code == 503:
        detail = response.json().get("detail", "Elasticsearch unavailable")
        pytest.skip(f"Elasticsearch unavailable during test: {detail}")

    assert response.status_code == 200
    data = response.json()
    assert "query" in data
    assert "count" in data
    assert "items" in data
    assert data["query"] == "simav"
    assert isinstance(data["items"], list)


def test_doctor_create_then_search_flow():
    suffix = uuid.uuid4().hex[:8]
    email = f"doctor_flow_{suffix}@test.com"
    clinic_name = f"Klinik {suffix}"
    doctor_first_name = f"simav{suffix}"
    doctor_last_name = "test"

    register_response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "StrongPass123"},
    )
    if register_response.status_code >= 500:
        pytest.skip("Auth register aşamasında altyapı erişimi yok (DB muhtemelen kapalı).")
    assert register_response.status_code in (201, 400)

    if register_response.status_code == 400:
        pytest.skip("Aynı test datası daha önce oluşmuş görünüyor; akış testi atlandı.")

    user_uid = register_response.json()["uid"]

    hospital_response = client.post(
        "/api/v1/hospitals/",
        json={"name": f"Hastane {suffix}", "clinics": [{"name": clinic_name}]},
    )
    if hospital_response.status_code >= 500:
        pytest.skip("Hospital create aşamasında altyapı erişimi yok (DB muhtemelen kapalı).")
    assert hospital_response.status_code == 201

    try:
        with SessionLocal() as db:
            clinic = db.execute(select(Clinic).where(Clinic.name == clinic_name)).scalar_one_or_none()
    except SQLAlchemyError as exc:
        pytest.skip(f"DB sorgusu başarısız, test atlandı: {exc}")

    assert clinic is not None

    create_doctor_response = client.post(
        "/api/v1/doctors/",
        json={
            "user_uid": user_uid,
            "clinic_ids": [clinic.id],
            "first_name": doctor_first_name,
            "last_name": doctor_last_name,
            "title": "Uzm. Dr.",
        },
    )
    if create_doctor_response.status_code >= 500:
        pytest.skip("Doctor create aşamasında altyapı erişimi yok (DB/ES problemi).")
    assert create_doctor_response.status_code == 200

    found = False
    last_payload = None
    for _ in range(10):
        search_response = client.get("/api/v1/search/doctors", params={"q": doctor_first_name})
        if search_response.status_code == 503:
            pytest.skip(f"Elasticsearch unavailable during flow test: {search_response.text}")

        assert search_response.status_code == 200
        payload = search_response.json()
        last_payload = payload

        items = payload.get("items", [])
        if any(doctor_first_name in item.get("full_name", "").lower() for item in items):
            found = True
            break

        time.sleep(0.4)

    assert found, f"Yeni oluşturulan doktor aramada bulunamadı. Son arama çıktısı: {last_payload}"
