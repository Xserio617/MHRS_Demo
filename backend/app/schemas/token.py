from pydantic import BaseModel

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str

# Token çözüldüğünde içinden çıkmasını beklediğimiz yapı
class TokenPayload(BaseModel):
    sub: str | None = None  # Biz token içine uid'yi 'sub' (subject) olarak koymuştuk
    type: str | None = None