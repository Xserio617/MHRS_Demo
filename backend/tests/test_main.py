from fastapi.testclient import TestClient
from app.main import app

# Test aracımızı uygulamamıza bağlıyoruz
client = TestClient(app)

def test_health_check():
    """
    /health endpoint'ine GET isteği atarak sistemin yanıt verip vermediğini test eder.
    """
    response = client.get("/health")
    
    # 1. Beklenti: HTTP 200 (Başarılı) dönmeli
    assert response.status_code == 200
    
    # 2. Beklenti: Dönen JSON bizim yazdığımız veriyle birebir eşleşmeli
    assert response.json() == {"status": "ok", "message": "MHRS API tıkır tıkır çalışıyor"}

def test_auth_router_exists():
    """
    /api/v1/auth/login adresine rastgele bir istek atarak rotanın doğru bağlanıp bağlanmadığını kontrol eder.
    Böyle bir POST metoduna GET attığımız için 405 Method Not Allowed veya eksik veriden 422 dönmelidir.
    Eğer 404 dönerse, router sisteme hiç bağlanmamış demektir.
    """
    response = client.get("/api/v1/auth/login")
    assert response.status_code != 404