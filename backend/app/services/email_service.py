from urllib.parse import urlencode

import httpx

from app.core.config import settings


BREVO_SEND_EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email"


def _build_verification_link(token: str) -> str:
    query = urlencode({"verify_token": token})
    return f"{settings.FRONTEND_BASE_URL.rstrip('/')}/auth?{query}"


def send_email_verification_email(to_email: str, token: str) -> None:
    if not settings.BREVO_API_KEY:
        raise RuntimeError("BREVO_API_KEY tanımlı değil.")
    if not settings.BREVO_SENDER_EMAIL:
        raise RuntimeError("BREVO_SENDER_EMAIL tanımlı değil.")

    verify_link = _build_verification_link(token)
    html_content = (
        "<h2>MHRS E-posta Doğrulama</h2>"
        "<p>Hesabını doğrulamak için aşağıdaki bağlantıyı kullan:</p>"
        f"<p><a href=\"{verify_link}\">E-postamı doğrula</a></p>"
        f"<p>Bu bağlantı {settings.EMAIL_VERIFICATION_EXPIRE_MINUTES} dakika sonra geçersiz olur.</p>"
    )

    payload = {
        "sender": {
            "name": settings.BREVO_SENDER_NAME,
            "email": settings.BREVO_SENDER_EMAIL,
        },
        "to": [{"email": to_email}],
        "subject": "MHRS - E-posta doğrulama",
        "htmlContent": html_content,
    }
    headers = {
        "accept": "application/json",
        "api-key": settings.BREVO_API_KEY,
        "content-type": "application/json",
    }

    with httpx.Client(timeout=10.0) as client:
        response = client.post(BREVO_SEND_EMAIL_ENDPOINT, json=payload, headers=headers)

    if response.status_code >= 400:
        raise RuntimeError(f"Brevo gönderim hatası ({response.status_code}): {response.text}")
