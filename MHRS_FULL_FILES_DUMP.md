# MHRS Full Files Dump (Güncel Envanter + Sorumluluklar)

Son güncelleme: 2026-03-05

Bu doküman, güncel kod tabanındaki ana klasörleri, kritik dosyaları ve çalışma akışını listeler.

---

## 1) Kök Envanter

```text
alembic.ini
docker-compose.yml
pytest.ini
MHRS_PROJECT_DOCUMENTATION.md
MHRS_FULL_FILES_DUMP.md
alembic/
backend/
frontend/
```

---

## 2) Alembic Envanteri

```text
alembic/
├── env.py
├── README
├── script.py.mako
└── versions/
    ├── e74352085907_init_tables.py
    ├── ad63ff9bd26c_init_tables.py
    ├── b9f2c1d4e8a1_add_rbac_refresh_columns.py
    ├── c5f2a4d11e2b_add_doctor_application_fields.py
    └── d4e6a7b9c001_add_hospital_city_district.py
```

### Sorumluluklar

- `e743...`: temel tablolar
- `ad63...`: no-op geçiş migration
- `b9f2...`: `is_admin` + refresh token alanları
- `c5f2...`: doktor başvuru alanları (`wants_doctor_role`, `doctor_application_status`, `preferred_hospital_id`)
- `d4e6...`: hastane `city` / `district`

---

## 3) Backend Envanteri

```text
backend/
├── Dockerfile
├── Jenkinsfile
├── requirements.txt
├── app/
│   ├── main.py
│   ├── api/
│   │   ├── dependencies.py
│   │   └── v1/
│   │       ├── auth.py
│   │       ├── appointments.py
│   │       ├── hospitals.py
│   │       ├── doctors.py
│   │       └── search.py
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── es_client.py
│   │   └── security.py
│   ├── models/
│   │   ├── user.py
│   │   ├── hospital.py
│   │   ├── doctor.py
│   │   └── appointment.py
│   ├── schemas/
│   │   ├── user.py
│   │   ├── token.py
│   │   ├── hospital.py
│   │   ├── doctor.py
│   │   └── appointment.py
│   ├── search/
│   │   └── es_client.py
│   ├── services/
│   │   ├── auth_services.py
│   │   ├── hospital_services.py
│   │   ├── doctor_services.py
│   │   └── appointment_service.py
│   └── tasks/
│       ├── rabbitmq.py
│       └── consumers.py
└── tests/
    ├── test_main.py
    └── test_search.py
```

---

## 4) Backend Kritik Dosya Kataloğu

### `backend/app/main.py`
- FastAPI init
- ES index bootstrap (`lifespan`)
- global error format
- router registration

### `backend/app/api/v1/auth.py`
- `/register`, `/login`, `/refresh`, `/users`, `/me`
- `/me` ile rol tabanlı frontend yönlendirme desteği

### `backend/app/api/v1/search.py`
- `/search/doctors`
- `/search/available-doctors` (date-range + filtre)

### `backend/app/api/v1/appointments.py`
- `POST /appointments/` (randevu oluşturma)
- `GET /appointments/me` (hasta randevuları)
- `GET /appointments/doctor/me` (doktor randevuları)
- `DELETE /appointments/{appointment_uid}` (iptal)
- `GET /appointments/doctor/{doctor_id}/busy-slots?date=YYYY-MM-DD` (seçili gün dolu saatleri)

### `backend/app/core/config.py`
- MariaDB, ES, RabbitMQ ayarları

### `backend/app/services/doctor_services.py`
- doktor onayında kullanıcı role/statü güncelleme
- ES indexleme + queue publish

---

## 5) Frontend Envanteri (Next.js App Router)

```text
frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── admin/
│   │   ├── page.tsx
│   │   └── panel/
│   │       └── page.tsx
│   ├── doctor/
│   │   └── page.tsx
│   ├── hastane/
│   │   └── page.tsx
│   ├── randevu-al/
│   │   └── page.tsx
│   └── randevu-ara/
│       └── page.tsx
├── components/
│   ├── mhrs/
│   └── ui/
├── lib/
│   ├── mhrs-api.ts
│   └── utils.ts
├── public/
│   └── mhrs-brand.svg
├── package.json
├── next.config.mjs
└── next-env.d.ts
```

---

## 6) Frontend Kritik Dosya Kataloğu

### `frontend/app/admin/page.tsx`
- **Yetkili Giriş Sayfası**
- doktor başvurusu + doktor/admin login
- role bazlı yönlendirme (`/doctor` veya `/admin/panel`)
- `/auth/me` + 404 fallback (`/auth/users`)

### `frontend/app/admin/panel/page.tsx`
- admin panel operasyonları
- hastane oluşturma, klinik ekleme, doktor onayı
- bekleyen havuz optimistik güncelleme
- Elasticsearch ile doktor arama kartı

### `frontend/app/doctor/page.tsx`
- doktor giriş sonrası hedef panel
- role guard + logout
- canlı randevu listesi (yaklaşan/geçmiş)
- aktif/iptal/tamamlanan sayaçları

### `frontend/lib/mhrs-api.ts`
- tüm backend API çağrıları
- `getMe` helper
- arama/filtre endpoint entegrasyonu
- doktor randevu endpointi (`getDoctorAppointments`)
- doktor dolu saat endpointi (`getDoctorBusySlots`)

### `frontend/components/mhrs/appointment-search-form.tsx`
- başlangıç/bitiş tarihi takvim tabanlı seçim
- elle tarih girişini kapatan akış
- `dd/MM/yyyy` görünüm standardı

### `frontend/components/mhrs/hospital-results.tsx`
- doktor seçimi sonrası `randevu-al` sayfasına doktor/context query taşıma

### `frontend/components/mhrs/appointment-booking.tsx`
- query’den doktor/context okuma
- seçili gün için dolu saatleri backend’den çekme
- sadece dolu/uygunsuz slotları kilitleme
- onay modalından gerçek `createAppointment` çağrısı

---

## 7) Docker Compose Servisleri

```text
docker-compose.yml services:
- mariadb
- elasticsearch
- rabbitmq
```

---

## 8) CI/CD (Jenkins)

`backend/Jenkinsfile` güncel pipeline:

1. Checkout
2. Altyapı servislerini ayağa kaldır (`mariadb`, `elasticsearch`, `rabbitmq`)
3. Backend venv + dependencies
4. Alembic migration
5. Backend test (`pytest`, JUnit)
6. Frontend build
7. API smoke test (`/health`, `/auth/users`)
8. Backend Docker image build
9. Cleanup (`docker compose down`)

Pipeline Windows/Linux agent uyumlu olacak şekilde güncellenmiştir.

---

## 9) Operasyonel Çalışma Dizisi

1. `docker-compose up -d`
2. `alembic upgrade head`
3. backend (`uvicorn`)
4. frontend (`next dev`)
5. (opsiyonel) consumer process

---

## 10) Çalıştırma Komutları

### Altyapı
```bash
cd D:\Projects\MSRN
docker-compose up -d
```

### Migration
```bash
cd D:\Projects\MSRN\backend
..\.venv\Scripts\python.exe -m alembic -c ..\alembic.ini upgrade head
```

### Backend
```bash
cd D:\Projects\MSRN
..\MSRN\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8001
```

### Frontend
```bash
cd D:\Projects\MSRN\frontend
npm install
npm run dev -- -H 127.0.0.1 -p 5173
```

### Consumer
```bash
cd D:\Projects\MSRN
set PYTHONPATH=D:\Projects\MSRN\backend
D:\Projects\MSRN\.venv\Scripts\python.exe -m app.tasks.consumers
```

---

## 11) Bu Güncellemede Eklenen Başlıklar

- Next.js App Router geçişi ve yeni route envanteri
- admin/doctor sayfa ayrımı
- doktor başvuru havuzu + onay akışı
- MongoDB entegrasyonu kaldırıldı, tek veri tabanı stratejisine dönüldü
- Elasticsearch admin arama paneli
- Jenkins tam otomasyon pipeline güncellemeleri
- dinamik slot kilitleme (doktor dolu saatine göre)
- doktor panelinin canlı randevu yönetimi
- tarih alanlarının takvim tabanlı standardizasyonu (`dd/MM/yyyy`)

---

## 12) Credential Envanteri (Teslim İçin)

### 12.1 Altyapı Bilgileri

| Bileşen | Değer |
|---|---|
| MariaDB Host | `localhost` |
| MariaDB Port | `3306` |
| MariaDB User | `root` |
| MariaDB Password | `password` |
| MariaDB DB | `mhrs_db` |
| RabbitMQ AMQP | `amqp://guest:guest@localhost:5672//` |
| RabbitMQ UI | `http://localhost:15672` (`guest/guest`) |
| Elasticsearch URL | `http://localhost:9200` |
| Elasticsearch Auth | Kapalı (dev: `xpack.security.enabled=false`) |

### 12.2 JWT / Security Ayarları

| Ayar | Default |
|---|---|
| `SECRET_KEY` | `change-this-secret-key-at-least-32-bytes` |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` |

### 12.3 Frontend Session Anahtarları

- `mhrs_access_token`
- `mhrs_refresh_token`
- `mhrs_role`
- `mhrs_email`

### 12.4 Uygulama Hesap Notu

- Kodda hard-coded admin hesabı yok.
- Admin girişi için DB’de kullanıcıda `is_admin=true` gereklidir.
- Doktor girişi için `is_doctor=true` gereklidir.

---

## 13) UID Kullanım Envanteri

| Alan | Dosya | Amaç |
|---|---|---|
| `users.uid` | `backend/app/models/user.py` | Dış dünyaya açılan kullanıcı kimliği, JWT `sub` alanı. |
| `appointments.uid` | `backend/app/models/appointment.py` | Dışa açık randevu kimliği, iptal gibi işlemlerde kullanılır. |
| `DoctorCreate.user_uid` | `backend/app/schemas/doctor.py` ve `doctor_services.py` | Doktor onayında kullanıcıyı UID ile bulmak. |

Kural: Internal FK ilişkilerde integer ID, public/API kimlikte UID kullanımı.

---

## 14) Elasticsearch ve RabbitMQ Akış Haritası

### 14.1 Elasticsearch

- İndeks adı: `doctors_index`
- Bootstrap: `backend/app/main.py` içindeki startup (`create_doctor_index`)
- Yazma:
    - Doğrudan indexleme: `backend/app/services/doctor_services.py`
    - Kuyruk üzerinden indexleme: `sync_doctor_to_es` queue + consumer
- Okuma:
    - `GET /api/v1/search/doctors`
    - `GET /api/v1/search/available-doctors`

### 14.2 RabbitMQ

Queue’lar:

1. `send_appointment_notification`
     - Producer: `backend/app/api/v1/appointments.py`
     - Consumer: `backend/app/tasks/consumers.py` (`_handle_notification`)

2. `sync_doctor_to_es`
     - Producer: `backend/app/services/doctor_services.py`
     - Consumer: `backend/app/tasks/consumers.py` (`_handle_doctor_sync`)

---

## 15) Teslimde Mutlaka Aktarılacak Operasyonel Bilgi

1. Dev credential’lar repoda default geliyor; production’da mutlaka değiştirilmeli.
2. `.env` üzerinden override edilmeyen ortamda `config.py` defaultları aktif olur.
3. RabbitMQ consumer process ayrı ayağa kaldırılabilir (opsiyonel fakat önerilir).
4. İlk admin kullanıcı bootstrap işlemi operasyon notu olarak ayrıca tanımlanmalı.
5. Sistem sağlık kontrolü: `/health`, ES health, queue bağlantı logları, frontend role redirect testleri.
