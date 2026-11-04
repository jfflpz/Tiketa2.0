"""Generate disposable TLS/config files. Never use these in production."""
from datetime import UTC, datetime, timedelta
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID

root = Path("/workspace/.validation")
tls = root / "tls"
tls.mkdir(parents=True, exist_ok=True)
key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "localhost")])
cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
        .serial_number(x509.random_serial_number()).not_valid_before(datetime.now(UTC)-timedelta(minutes=1))
        .not_valid_after(datetime.now(UTC)+timedelta(days=1))
        .add_extension(x509.SubjectAlternativeName([x509.DNSName("localhost")]), critical=False).sign(key, hashes.SHA256()))
(tls/"privkey.pem").write_bytes(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
(tls/"fullchain.pem").write_bytes(cert.public_bytes(serialization.Encoding.PEM))
environment = """POSTGRES_DB=tiketa_smoke
POSTGRES_USER=tiketa_smoke
POSTGRES_PASSWORD=disposable-smoke-password
REDIS_PASSWORD=disposable-redis-password
DATABASE_URL=postgresql+asyncpg://tiketa_smoke:disposable-smoke-password@db/tiketa_smoke
REDIS_URL=redis://:disposable-redis-password@redis:6379/0
SECRET_KEY=disposable-smoke-signing-key-more-than-32-characters
APP_FIELD_ENCRYPTION_KEY=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
ENVIRONMENT=production
CORS_ORIGINS=["https://localhost:18443"]
PUBLIC_BASE_URL=https://localhost:18443
SMTP_HOST=mail.invalid
SMTP_PORT=587
SMTP_STARTTLS=true
MAIL_FROM=tiketa@example.com
BACKEND_IMAGE=tiketa-backend:sprint-review
TLS_CERT_DIR=./.validation/tls
TIKETA_ENV_FILE=.validation/runtime.env
"""
(root/"runtime.env").write_text(environment)
(root/"compose.override.yml").write_text("""services:
  proxy:
    ports: !override ["127.0.0.1:18443:443"]
""")
print("Disposable smoke configuration created under .validation")
