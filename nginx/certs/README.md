# SSL Certificate Setup (Cloudflare Origin Certificate)

Place two files in this directory before running `docker compose up`:

| File | Description |
|------|-------------|
| `origin.crt` | Cloudflare Origin Certificate (PEM format) |
| `origin.key` | Private key for the certificate |

## How to generate

1. Log in to [Cloudflare dashboard](https://dash.cloudflare.com)
2. Select your domain → **SSL/TLS** → **Origin Server**
3. Click **Create Certificate**
4. Choose:
   - Key type: **RSA (2048)**
   - Hostnames: your domain (e.g. `damage.yourcompany.com`)
   - Certificate Validity: **15 years** (recommended for internal use)
5. Click **Create**
6. Copy the **Origin Certificate** → save as `nginx/certs/origin.crt`
7. Copy the **Private Key** → save as `nginx/certs/origin.key`

## Cloudflare dashboard setting

Set **SSL/TLS encryption mode** to **Full (Strict)** in your Cloudflare domain settings.

> ⚠️ These files are excluded from git via `.gitignore`. Never commit private keys.
