# MHRS Proje Dökümantasyonu (Güncel Durum)

Son güncelleme: 2026-03-05

Bu doküman, proje mimarisini ve aktif çalışan akışları mevcut kod tabanına göre özetler.

---

## 1) Proje Özeti

MHRS projesi iki ana katmandan oluşur:

1. **Backend** (FastAPI + MariaDB + Elasticsearch + RabbitMQ)
2. **Frontend** (Next.js App Router + React + TypeScript)

Güncel sürümde öne çıkanlar:

- Hasta randevu akışında saat slotları artık **dinamik** çalışır.
- Slotlar sadece doktor için o gün **aktif randevu varsa kilitlenir**.
- Randevu al ekranı doktor/context bilgilerini hastane seçiminden query ile taşır.
- Doktor paneli placeholder olmaktan çıkıp canlı randevu listesiyle çalışır.
- Takvim/format akışında `dd/MM/yyyy` standardı uygulanmıştır.

---

## 2) Teknoloji Stack

### Backend
- FastAPI
- SQLAlchemy 2.x + Alembic
- MariaDB
- Elasticsearch 8.x
- RabbitMQ + aio-pika
- JWT (PyJWT) + Passlib

### Frontend
- Next.js 16 (App Router)
- React 19
- TypeScript
- Radix UI + Tailwind tabanlı UI katmanı
- react-day-picker tabanlı takvim bileşeni

### DevOps
- Docker Compose
- Jenkins Pipeline (Windows/Linux uyumlu)

---

## 3) Güncel Mimari Akışlar

### 3.1 Auth / Role / Portal Routing

- `POST /api/v1/auth/login` ile token alınır.
- `GET /api/v1/auth/me` ile current user + role okunur.
- Frontend role’a göre yönlendirir:
  - `is_admin=true` → `/admin/panel`
  - `is_doctor=true` → `/doctor`

### 3.2 Hasta Randevu Akışı

- `randevu-ara` ekranında tarih alanları takvimden seçilir (elle giriş yok).
- Tarih formatı görünümde `dd/MM/yyyy` şeklindedir.
- `hastane` ekranından seçilen doktor bilgisi `randevu-al` ekranına query ile taşınır.
- `randevu-al` ekranı, seçilen gün için backend’den dolu saatleri çekip sadece bu saatleri kilitler.
- Onayda gerçek `POST /api/v1/appointments/` çağrısı yapılır ve başarılı kayıttan sonra dolu saatler yenilenir.

### 3.3 Doktor Paneli

- `doctor` ekranı role guard ile korunur.
- `GET /api/v1/appointments/doctor/me` ile doktorun randevuları listelenir.
- Aktif / iptal / tamamlanan sayaçları gösterilir.
- Yaklaşan ve geçmiş/diğer randevular ayrıştırılmış görünür.

---

## 4) Backend Bileşenleri

### 4.1 Ana Modüller

- `app/api/v1/auth.py`
  - register, login, refresh, users, me
- `app/api/v1/appointments.py`
  - create, my appointments, doctor my appointments, cancel
  - **yeni:** `GET /doctor/{doctor_id}/busy-slots?date=YYYY-MM-DD`
- `app/api/v1/doctors.py`
  - doktor oluşturma / onay
- `app/api/v1/search.py`
  - doctors, available-doctors

### 4.2 Migration Zinciri

1. `e74352085907_init_tables`
2. `ad63ff9bd26c_init_tables` (no-op)
3. `b9f2c1d4e8a1_add_rbac_refresh_columns`
4. `c5f2a4d11e2b_add_doctor_application_fields`
5. `d4e6a7b9c001_add_hospital_city_district`

---

## 5) Frontend Bileşenleri

### 5.1 Route Yapısı

- `/admin` → Yetkili Giriş Sayfası
- `/admin/panel` → Admin Sayfası
- `/doctor` → Doktor Sayfası
- `/randevu-ara`, `/hastane`, `/randevu-al` → hasta akışları

### 5.2 Kritik Sayfalar

- `app/admin/page.tsx`
  - doktor başvurusu
  - doktor login
  - admin login
  - role bazlı redirect
- `app/admin/panel/page.tsx`
  - hastane/klinik işlemleri
  - doktor onayı
  - ES doktor arama
- `components/mhrs/appointment-search-form.tsx`
  - takvim tabanlı başlangıç/bitiş tarih seçimi
- `components/mhrs/hospital-results.tsx`
  - doktor listesinden `randevu-al` ekranına query taşıma
- `components/mhrs/appointment-booking.tsx`
  - doktorun dolu saatlerini çekip dinamik slot kilitleme
  - gerçek randevu oluşturma çağrısı
- `app/doctor/page.tsx`
  - canlı doktor paneli + randevu listeleri

---

## 6) DevOps ve Jenkins Otomasyonu

`backend/Jenkinsfile` ile tam otomasyon:

1. Checkout
2. Docker infra up (`mariadb`, `elasticsearch`, `rabbitmq`)
3. Backend environment setup
4. Alembic migration
5. Backend test + JUnit raporu
6. Frontend build
7. API smoke test (`/health`, `/auth/users`)
8. Backend Docker image build/tag
9. Cleanup (`docker compose down`)

---

## 7) Operasyon Komutları (Güncel)

### 7.1 Altyapı
```bash
cd D:\Projects\MSRN
docker-compose up -d
```

### 7.2 Migration
```bash
cd D:\Projects\MSRN\backend
..\.venv\Scripts\python.exe -m alembic -c ..\alembic.ini upgrade head
```

### 7.3 Backend
```bash
cd D:\Projects\MSRN
D:\Projects\MSRN\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8001
```

### 7.4 Frontend
```bash
cd D:\Projects\MSRN\frontend
npm install
npm run dev -- -H 127.0.0.1 -p 5173
```

### 7.5 Elasticsearch Health
```bash
curl.exe -s http://127.0.0.1:9200/_cluster/health
```

---

## 8) Bilinen Operasyon Notları

1. Backend yeni endpointler için restart gerektirir (`busy-slots` vb.).
2. ES kapalıysa admin ve hasta arama akışları hata üretir (`Connection refused` / 503).
3. Frontend’de token/rol localStorage’da tutulur (`mhrs_access_token`, `mhrs_refresh_token`, `mhrs_role`, `mhrs_email`).

---

## 9) Son Değişiklik Özeti

- Randevu slot kilitleme statikten dinamiğe alındı.
- `GET /appointments/doctor/{doctor_id}/busy-slots` endpointi eklendi.
- Randevu onay modalı gerçek backend create akışına bağlandı.
- Doktor paneli canlı randevu listesi/sayaçlarla tamamlandı.
- Takvim ve tarih formatları `dd/MM/yyyy` standardına çekildi.

---

## 10) Credentials / Secrets / Erişim Bilgileri (Tam Liste)

Bu bölüm teslim için kritik bölümdür. Aşağıdaki bilgiler kod tabanında aktif kullanılan değerlere göre hazırlanmıştır.

### 10.1 Altyapı Servis Credentials

| Servis | Host/Port | Username | Password | Nerede Tanımlı | Not |
|---|---|---|---|---|---|
| MariaDB | `localhost:3306` | `root` | `password` | `docker-compose.yml`, `backend/app/core/config.py` | Geliştirme default'u. |
| RabbitMQ AMQP | `localhost:5672` | `guest` | `guest` | `docker-compose.yml`, `backend/app/core/config.py` (`RABBITMQ_URL`) | Producer/consumer bu bağlantıyı kullanır. |
| RabbitMQ UI | `http://localhost:15672` | `guest` | `guest` | `docker-compose.yml` | Queue gözlemleme için yönetim paneli. |
| Elasticsearch | `http://localhost:9200` | Yok | Yok | `docker-compose.yml` (`xpack.security.enabled=false`), `backend/app/core/config.py` | Dev modda auth kapalı. |

### 10.2 Uygulama Güvenlik Değerleri

| Ayar | Değer (default) | Nerede Tanımlı | Kullanım |
|---|---|---|---|
| `SECRET_KEY` | `change-this-secret-key-at-least-32-bytes` | `backend/app/core/config.py` | Access/refresh JWT imzalama. |
| `ALGORITHM` | `HS256` | `backend/app/core/config.py` | JWT imza algoritması. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | `backend/app/core/config.py` | Access token TTL. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | `backend/app/core/config.py` | Refresh token TTL. |

### 10.3 Frontend Tarafında Saklanan Kimlik Verileri

`localStorage` anahtarları:

- `mhrs_access_token`
- `mhrs_refresh_token`
- `mhrs_role`
- `mhrs_email`

Bu anahtarlar özellikle `admin`, `doctor`, `randevu` akışlarının yetki ve yönlendirme davranışını belirler.

### 10.4 Uygulama Kullanıcısı (Admin/Doktor) Giriş Bilgileri

- Kod tabanında **hard-coded admin e-posta/şifre yoktur**.
- Doktor/Admin hesabı normal kullanıcı kayıt/giriş süreçleriyle oluşur.
- Admin girişi yapabilmek için ilgili kullanıcının veritabanında `is_admin=true` olması gerekir.
- Doktor girişi yapabilmek için `is_doctor=true` olması gerekir (doktor onay akışından sonra).

### 10.5 Teslim İçin Güvenlik Uyarısı

Bu repo içindeki credential değerleri geliştirme amaçlıdır. Teslim/production senaryosunda:

1. `SECRET_KEY` mutlaka değiştirilmeli.
2. MariaDB ve RabbitMQ default parola/hesapları değiştirilmeli.
3. Elasticsearch security açık çalıştırılmalı (xpack).
4. Tüm secret’lar `.env` veya secret manager’dan beslenmeli.

---

## 11) UID Kullanımı (Neden, Nerede, Nasıl)

### 11.1 Temel Strateji

Sistem içi ilişkilerde integer ID kullanılırken, dış dünyaya UID (UUID4) açılır.

- `users.id` → DB iç ilişkiler için
- `users.uid` → API/JWT/dış iletişim için
- `appointments.id` → DB iç ilişkiler için
- `appointments.uid` → dışa açık güvenli randevu kimliği

### 11.2 Auth Akışında UID

1. Kullanıcı login olur (`/auth/login`).
2. JWT `sub` claim alanına **`user.uid`** yazılır.
3. Korumalı endpointlerde token decode edilir.
4. `sub` ile `get_user_by_uid` çağrılır.

Böylece DB’deki sıralı ID dışarı sızdırılmaz.

### 11.3 Doktor Oluşturma Akışında UID

Doktor onay endpointi `DoctorCreate.user_uid` alır ve ilgili kullanıcıyı UID üzerinden bulur.

### 11.4 Randevu İptal Akışında UID

Randevu iptal endpointi path parametresi olarak `appointment_uid` alır.

---

## 12) Elasticsearch Entegrasyonu (Baştan Sona)

### 12.1 İndeks ve Mapping

- İndeks adı: `doctors_index`
- Oluşturan kod: `app/search/es_client.py` (`create_doctor_index`)
- Uygulama startup’ında (`lifespan`) indeks bootstrap edilir.

Mapping’teki ana alanlar:

- `doctor_id` (integer)
- `full_name` (text + Turkish analyzer)
- `title` (keyword)
- `clinics` (keyword[])
- `hospitals` (keyword[])
- `cities` (keyword[])

### 12.2 Yazma (Indexleme) Akışı

Doktor oluşturulduğunda:

1. Doktor verisi DB’ye yazılır.
2. `doctor_services.create_doctor` içinde `es_data` hazırlanır.
3. Doğrudan `index_doctor_document(es_data)` ile ES’e yazma denenir.
4. Ayrıca RabbitMQ `sync_doctor_to_es` kuyruğuna mesaj bırakılır (asenkron senkronizasyon için).

### 12.3 Okuma (Arama) Akışı

- Endpoint: `GET /api/v1/search/doctors?q=...`
- Çok alanlı `multi_match` arama kullanılır (`full_name`, `clinics`, `hospitals`, `cities`).
- ES erişilemiyorsa API `503` döner.

### 12.4 Kullanıldığı Frontend Ekranları

- `randevu-ara` akışı (doktor arama)
- `admin/panel` içindeki “Elasticsearch ile Doktor Ara”

---

## 13) RabbitMQ Entegrasyonu (Baştan Sona)

### 13.1 Queue Listesi

| Queue | Producer | Consumer | Amaç |
|---|---|---|---|
| `send_appointment_notification` | `appointments.py` | `tasks/consumers.py` (`_handle_notification`) | Randevu oluşturma/iptal olaylarını async işlemek (mail/SMS için hazırlık). |
| `sync_doctor_to_es` | `doctor_services.py` | `tasks/consumers.py` (`_handle_doctor_sync`) | Doktor verisini ES ile eventual consistency senkronlamak. |

### 13.2 Producer Davranışı

- Dosya: `backend/app/tasks/rabbitmq.py`
- `aio_pika.connect_robust` ile bağlantı kurulur.
- Queue `durable=True` oluşturulur.
- Mesajlar `delivery_mode=PERSISTENT` ile yayınlanır.

### 13.3 Consumer Çalıştırma

```bash
cd D:\Projects\MSRN
set PYTHONPATH=D:\Projects\MSRN\backend
D:\Projects\MSRN\.venv\Scripts\python.exe -m app.tasks.consumers
```

Consumer çalışmıyorsa queue’ya mesaj düşer ancak async etkiler (özellikle doktor-ES sync) gecikebilir.

---

## 14) Kimlik Doğrulama ve Token Lifecycle Detayı

### 14.1 Login

- `POST /api/v1/auth/login`
- Form body `username=<email>` + `password=<plain_password>`
- Dönüş:
  - `access_token`
  - `refresh_token`
  - `token_type=bearer`

### 14.2 Refresh

- `POST /api/v1/auth/refresh`
- Payload: `refresh_token`
- Backend refresh token’ı decode eder (`type=refresh` kontrolü)
- Kullanıcının DB’de saklanan `refresh_token_hash` değeri ile verify edilir
- Başarılıysa yeni access+refresh üretilir, hash güncellenir

### 14.3 Şifreleme

- `passlib` `CryptContext` şemaları: `bcrypt_sha256`, `bcrypt`
- Düz parola DB’ye yazılmaz (`hashed_password` tutulur)

---

## 15) Uçtan Uca Akış Senaryoları

### 15.1 Doktor Adayı → Doktor

1. Aday kullanıcı kayıt olur (`wants_doctor_role=true`).
2. Admin panelde aday onaylanır.
3. `is_doctor=true`, `doctor_application_status=approved` olur.
4. Doktor `/doctor` paneline login olabilir.

### 15.2 Hasta Randevu Alma

1. `randevu-ara` ekranında filtre ve tarih seçilir.
2. `hastane` ekranında uygun doktor listesi gelir.
3. Doktor seçilip `randevu-al` ekranına geçilir.
4. Ekran seçili gün için `busy-slots` endpointini çağırır.
5. Dolu saatler kilitli görünür.
6. Uygun saat seçilip onaylanır, `POST /appointments/` çağrılır.

### 15.3 Doktor Paneli

1. Doktor login olur.
2. `GET /appointments/doctor/me` çağrılır.
3. Yaklaşan/geçmiş randevular ayrıştırılıp gösterilir.

---

## 16) Proje Teslimi İçin Kontrol Listesi

1. Altyapı servisleri ayağa kalkıyor mu (`mariadb`, `elasticsearch`, `rabbitmq`)?
2. Alembic migration `head` durumda mı?
3. Backend `/health` dönüyor mu?
4. Frontend build başarılı mı?
5. En az 1 admin hesap var mı (`is_admin=true`)?
6. En az 1 doktor hesap var mı (`is_doctor=true`)?
7. RabbitMQ consumer süreci çalışıyor mu (opsiyonel ama önerilir)?
8. ES index (`doctors_index`) oluştu mu?
9. Test login + refresh + role redirect akışları geçti mi?

Bu kontrol listesiyle projeyi devralan kişi sistemin hangi credential ile nereden çalıştığını ve tüm kritik akışları doğrudan anlayabilir.

---

## 17) İlk Admin Bootstrap (Zorunlu Operasyon Notu)

Projede hard-coded admin hesabı yoktur. İlk admin için tipik yöntem:

1. `/admin` ekranından normal kullanıcı kaydı yap.
2. MariaDB’de ilgili kullanıcıyı admin’e yükselt.

Örnek SQL:

```sql
UPDATE users
SET is_admin = 1
WHERE email = 'admin@example.com';
```

3. Aynı kullanıcıyla `/admin` ekranından “Admin Girişi” yap.
4. Sonrasında doktor aday onayı, hastane/klinik yönetimi panelden ilerletilebilir.
