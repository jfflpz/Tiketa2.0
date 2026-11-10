# Tiketa 2.0 — Hostinger VPS Production Deployment Runbook

This guide covers deploying **Tiketa 2.0** on a Hostinger KVM VPS running Ubuntu 22.04 or 24.04 LTS.

---

## 1. Initial VPS Setup & Dependencies

Connect to your VPS via SSH:
```bash
ssh root@YOUR_SERVER_IP

Install Docker, Docker Compose v2, and Certbot:

apt update && apt upgrade -y
apt install -y curl git ufw certbot

# Install Docker Engine & Compose plugin
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

# Configure firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
──────
## 2. DNS & SSL Certificate Generation

1. In Hostinger DNS Manager, create an A Record pointing your domain (e.g., tiketa.yourcompany.com) to your VPS IP address.
2. Generate free Let's Encrypt certificates before starting Nginx:

certbot certonly --standalone -d tiketa.yourcompany.com -m your-email@example.com --agree-tos --no-eff-email

Your certificates will be stored at: /etc/letsencrypt/live/tiketa.yourcompany.com/
──────
## 3. Clone Repository & Build Frontend

cd /opt
git clone https://github.com/jfflpz/Tiketa2.0.git tiketa
cd /opt/tiketa

# Make deployment scripts executable
chmod +x deploy/*.sh

# Install Node.js (v20+) and build frontend assets
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
cd frontend
npm ci
npm run build
cd ..
──────
## 4. Configure Production Environment

Create your production configuration from the example template:

cp .env.production.example .env.production
nano .env.production

Generate secure secrets on your server:

# Generate 32-character SECRET_KEY:
openssl rand -hex 32

# Generate 32-byte Base64 APP_FIELD_ENCRYPTION_KEY:
openssl rand -base64 32

# Generate random passwords for POSTGRES and REDIS:
openssl rand -hex 16

Fill in .env.production:

POSTGRES_DB=tiketa
POSTGRES_USER=tiketa
POSTGRES_PASSWORD=YOUR_GENERATED_POSTGRES_PASSWORD
REDIS_PASSWORD=YOUR_GENERATED_REDIS_PASSWORD
DATABASE_URL=postgresql+asyncpg://tiketa:YOUR_GENERATED_POSTGRES_PASSWORD@db/tiketa
REDIS_URL=redis://:YOUR_GENERATED_REDIS_PASSWORD@redis:6379/0
SECRET_KEY=YOUR_GENERATED_SECRET_KEY
APP_FIELD_ENCRYPTION_KEY=YOUR_GENERATED_ENCRYPTION_KEY
ENVIRONMENT=production
CORS_ORIGINS=["https://tiketa.yourcompany.com"]
PUBLIC_BASE_URL=https://tiketa.yourcompany.com
SMTP_HOST=mail.yourcompany.com
SMTP_PORT=587
SMTP_STARTTLS=true
SMTP_USERNAME=tiketa-noreply@yourcompany.com
SMTP_PASSWORD=YOUR_SMTP_PASSWORD
MAIL_FROM=tiketa-noreply@yourcompany.com
BACKEND_IMAGE=tiketa-backend:production
TLS_CERT_DIR=/etc/letsencrypt/live/tiketa.yourcompany.com

Build the backend production image:

docker build -t tiketa-backend:production -f backend/Dockerfile --target production backend
──────
## 5. Deploy Database & Services

Run the deployment script:

APPROVED_DEPLOYMENT="initial-release" ./deploy/deploy_prod.sh --apply

This automatically:

• Starts PostgreSQL 16 and Redis 7.
• Applies all 13 Alembic database migrations (alembic upgrade head).
• Seeds core dictionary tables (Companies, Locations, Departments).
• Starts FastAPI backend and Nginx reverse proxy.
──────
## 6. One-Time Administrator Bootstrap

Run the bootstrap script to create your primary administrator account:

./deploy/bootstrap_admin.sh

Follow the interactive prompts:

Admin username (e.g. admin): ithead
Admin email (e.g. admin@five-star.ph): ithead@five-star.ph
Admin full name (e.g. IT Department Head): Jefferson Lopez
Initial administrator password: ********
Confirm password: ********

You can now navigate to https://tiketa.yourcompany.com and log in.
──────
## 7. Automated Daily Database Backups

Set up an automated daily backup at 2:00 AM using cron:

crontab -e

Add the following line:

0 2 * * * PGUSER=tiketa PGDATABASE=tiketa /opt/tiketa/deploy/backup_db.sh /var/backups/tiketa/tiketa_$(date +\%Y\%m\%d).sql.gz >>
/var/log/tiketa_backup.log 2>&1
──────
## 8. Common Maintenance Commands

• View Live Application Logs:
docker compose -f docker-compose.prod.yml logs -f backend proxy

• Restart Application Services:
docker compose -f docker-compose.prod.yml restart backend proxy

• Renew SSL Certificates:
docker compose -f docker-compose.prod.yml exec proxy nginx -s reload