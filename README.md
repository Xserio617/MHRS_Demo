# MSRN (MHRS Clone)

MSRN, Türkiye MHRS benzeri bir randevu yönetim sistemidir.

GitHub Repository: https://github.com/Xserio617/MHRS_Demo.git

Proje iki ana katmandan oluşur:
- **Backend:** FastAPI + SQLAlchemy + MariaDB + Elasticsearch + RabbitMQ
- **Frontend:** Next.js (App Router) + React + TypeScript

---

## İçindekiler
- [Özellikler](#özellikler)
- [Teknoloji Stack](#teknoloji-stack)
- [Proje Yapısı](#proje-yapısı)
- [Kurulum ve Çalıştırma](#kurulum-ve-çalıştırma)
- [API Özet](#api-özet)
- [Kimlik Doğrulama ve Roller](#kimlik-doğrulama-ve-roller)
- [UID Stratejisi](#uid-stratejisi)
- [Elasticsearch ve RabbitMQ](#elasticsearch-ve-rabbitmq)
- [Credentials / Geliştirme Varsayılanları](#credentials--geliştirme-varsayılanları)
- [Test ve Doğrulama](#test-ve-doğrulama)
- [Sık Karşılaşılan Sorunlar](#sık-karşılaşılan-sorunlar)

---

## Özellikler

- Hasta tarafında randevu arama / doktor seçme / saat seçme / randevu oluşturma
- Saat slotlarının dinamik kilitlenmesi (doktorun aktif randevularına göre)
- Admin paneli:
  - Hastane oluşturma
  - Kliniği hastaneye ekleme
  - Doktor aday onayı
  - Doktor yönetimi (listele / düzenle / kaldır)
  - Doktor türü: `tam` / `nobetci`
  - Mesai saatleri presetleri:
    - Tam: `08:30 - 17:00`
    - Nöbetçi: `16:00 - 08:00`
- Doktor paneli:
  - Kendi randevularını görüntüleme
  - Yaklaşan / geçmiş ayrımı
  - Durum sayaçları (aktif / iptal / tamamlanan)
- Elasticsearch ile doktor arama
- RabbitMQ ile async olay işleme (bildirim ve ES senkron)

---

## Teknoloji Stack

### Backend
- FastAPI
- SQLAlchemy 2.x
- Alembic
- MariaDB (PyMySQL)
- Elasticsearch 8.x
- RabbitMQ (aio-pika)
- JWT (PyJWT)
- Passlib (bcrypt_sha256)

### Frontend
- Next.js 16
- React 19
- TypeScript
- Tailwind + Radix tabanlı UI
- react-day-picker

---

## Proje Yapısı

```text
.
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── search/
│   │   └── tasks/
│   ├── tests/
│   ├── requirements.txt
│   └── Jenkinsfile
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── package.json
├── alembic/
├── docker-compose.yml
├── alembic.ini
└── README.md
```

---

## Kurulum ve Çalıştırma

### 0) Projeyi klonla

```bash
git clone https://github.com/Xserio617/MHRS_Demo.git
cd MHRS_Demo
```

### 1) Altyapıyı başlat

```bash
cd D:\Projects\MSRN
docker-compose up -d
```

### 2) Migration çalıştır

```bash
cd D:\Projects\MSRN\backend
..\.venv\Scripts\python.exe -m alembic -c ..\alembic.ini upgrade head
```

### 3) Backend’i başlat

```bash
cd D:\Projects\MSRN
D:\Projects\MSRN\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8001
```

### 4) Frontend’i başlat

```bash
cd D:\Projects\MSRN\frontend
npm install
npm run dev -- -H 127.0.0.1 -p 5173
```

### 4.1) Sunucuya bağlama hazırlığı (Prod)

Backend tarafında CORS origin listesi artık ortam değişkeninden yönetilir:

```bash
BACKEND_CORS_ORIGINS=https://mhrs.example.com,https://www.mhrs.example.com
```

Frontend tarafında API base URL'i ortam değişkeninden verilir:

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1
```

Not: Lokal geliştirmede mevcut varsayılanlar (`127.0.0.1`) çalışmaya devam eder.

### 5) (Opsiyonel) RabbitMQ consumer başlat

```bash
cd D:\Projects\MSRN
set PYTHONPATH=D:\Projects\MSRN\backend
D:\Projects\MSRN\.venv\Scripts\python.exe -m app.tasks.consumers
```

---

## API Özet

Base URL: `http://127.0.0.1:8001/api/v1`

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`
- `GET /auth/users`

### Appointment
- `POST /appointments/`
- `GET /appointments/me`
- `GET /appointments/doctor/me`
- `DELETE /appointments/{appointment_uid}`
- `GET /appointments/doctor/{doctor_id}/busy-slots?date=YYYY-MM-DD`

### Doctor
- `POST /doctors/`
- `GET /doctors/`
- `PUT /doctors/{doctor_id}`
- `DELETE /doctors/{doctor_id}`

### Search
- `GET /search/doctors?q=...`
- `GET /search/available-doctors?q=...&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`

---

## Kimlik Doğrulama ve Roller

- JWT tabanlı kimlik doğrulama kullanılır.
- Frontend’de oturum bilgileri `localStorage` içinde saklanır:
  - `mhrs_access_token`
  - `mhrs_refresh_token`
  - `mhrs_role`
  - `mhrs_email`
- Rol yönlendirmesi:
  - `is_admin=true` → `/admin/panel`
  - `is_doctor=true` → `/doctor`

### İlk Admin Kullanıcı
Projede hard-coded admin kullanıcı yoktur. İlk admin için:
1. Normal kullanıcı kaydı oluştur.
2. DB’de kullanıcıyı admin yap:

```sql
UPDATE users
SET is_admin = 1
WHERE email = 'admin@example.com';
```

---

## UID Stratejisi

Sistem dışına doğrudan DB integer ID açılmaz.

- `users.uid` JWT `sub` alanında kullanılır.
- `appointments.uid` dışa açık randevu kimliği olarak kullanılır.
- Internal ilişkilerde integer `id`, dış API’de `uid` tercih edilir.

---

## Elasticsearch ve RabbitMQ

### Elasticsearch
- İndeks: `doctors_index`
- Startup’ta index bootstrap edilir.
- Doktor arama endpointleri ES üzerinden çalışır.

### RabbitMQ Queue’ları
- `send_appointment_notification`
  - Randevu oluşturma/iptal olayları
- `sync_doctor_to_es`
  - Doktor verisinin ES ile senkronizasyonu

---

## Credentials / Geliştirme Varsayılanları

> Bu değerler geliştirme ortamı içindir. Production’da mutlaka değiştirin.

- MariaDB
  - Host: `localhost`
  - Port: `3306`
  - User: `root`
  - Password: `password`
  - DB: `mhrs_db`
- RabbitMQ
  - AMQP: `amqp://guest:guest@localhost:5672//`
  - UI: `http://localhost:15672` (`guest/guest`)
- Elasticsearch
  - URL: `http://localhost:9200`
  - Dev’de security kapalı (`xpack.security.enabled=false`)
- JWT
  - `SECRET_KEY=change-this-secret-key-at-least-32-bytes`
  - `ALGORITHM=HS256`
  - Access TTL: `60dk`
  - Refresh TTL: `7gün`

---

## Test ve Doğrulama

Backend testleri:

```bash
cd D:\Projects\MSRN\backend
D:\Projects\MSRN\.venv\Scripts\python.exe -m pytest
```

Hızlı sağlık kontrolleri:

```bash
curl.exe -s http://127.0.0.1:8001/health
curl.exe -s http://127.0.0.1:9200/_cluster/health
```

---

## Sık Karşılaşılan Sorunlar

1. **`Method Not Allowed` / endpoint uyuşmazlığı**
   - Sebep: Backend eski instance ile çalışıyor.
   - Çözüm: Backend restart + migration.

2. **`Unknown column ...` DB hatası**
   - Sebep: Yeni migration uygulanmamış.
   - Çözüm: `alembic upgrade head`.

3. **Frontend date input format farkı**
   - Çözüm: Takvim bileşeni ile `dd/MM/yyyy` standardı kullanılıyor.

4. **ES bağlantı hatası (`503`)**
   - Sebep: Elasticsearch kapalı.
   - Çözüm: `docker-compose up -d` ve health kontrolü.

---

Daha kapsamlı teknik teslim notları için:
- `MHRS_PROJECT_DOCUMENTATION.md`
- `MHRS_FULL_FILES_DUMP.md`
