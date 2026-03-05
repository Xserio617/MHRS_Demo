# 1. Taban İmaj: Resmi, hafifletilmiş Python 3.11 imajını kullanıyoruz.
# Alpine yerine 'slim' seçiyoruz çünkü Alpine bazen Python paketlerinin (bcrypt vb.) derlenmesinde sorun çıkarabilir.
FROM python:3.11-slim

# 2. Çalışma Dizini: Konteyner içindeki çalışma klasörümüzü belirliyoruz.
WORKDIR /app

# 3. Ortam Değişkenleri: Python'ın Docker içindeki davranışını optimize ediyoruz.
# PYTHONDONTWRITEBYTECODE: .pyc (önbellek) dosyalarının oluşturulmasını engeller.
# PYTHONUNBUFFERED: Logların gecikmeden doğrudan terminale (Jenkins loglarına) akmasını sağlar.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# 4. Gereksinimleri Kopyala ve Yükle
# Önce sadece requirements.txt'yi kopyalıyoruz. Bu sayede kod değişse bile, 
# yeni paket eklemediğimiz sürece Docker bu adımı önbellekten (cache) hızlıca geçer.
COPY requirements.txt .

# --no-cache-dir parametresi, pip'in indirdiği .whl dosyalarını silmesini sağlar. 
# Bu işlem Docker imaj boyutunu inanılmaz derecede küçültür.
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 5. Proje Kodlarını Kopyala
# app klasörümüzü konteynerin içine aktarıyoruz. (utils kullanmadığımız temiz yapı)
COPY ./app /app/app

# 6. Güvenlik: Non-Root Kullanıcı Oluşturma
# Konteyneri root yetkisiyle çalıştırmak güvenlik açığıdır. 
# Kısıtlı yetkilere sahip 'fastapi_user' adında bir kullanıcı açıp yetkiyi ona devrediyoruz.
RUN useradd -m fastapi_user
USER fastapi_user

# 7. Port Tanımı
# Uygulamanın dış dünyaya hangi porttan yayın yapacağını belirtiyoruz.
EXPOSE 8000

# 8. Uygulamayı Başlat (Uvicorn)
# FastAPI'yi ayağa kaldıran asenkron sunucumuz uvicorn'u çalıştırıyoruz.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]