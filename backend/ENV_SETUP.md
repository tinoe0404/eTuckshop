# Environment Variables Setup

## Required New Variables

Add these to your `.env` file:

```bash
# QR Code Security (generate random secrets)
QR_SIGNING_SECRET=<run: openssl rand -hex 32>

# PayNow Configuration (Developer/Test Mode)
PAYNOW_INTEGRATION_ID=<your_test_integration_id>
PAYNOW_INTEGRATION_KEY=<your_test_integration_key>
PAYNOW_WEBHOOK_SECRET=<provided_by_paynow_or_use_test_secret>

# Existing variables (ensure they're set)
DATABASE_URL=postgresql://...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
BACKEND_URL=http://localhost:5000
CLIENT_URL=http://localhost:3000
PORT=5000
NODE_ENV=development
```

## Generating Secrets

### On Windows (PowerShell):
```powershell
# Generate QR SigningSecret
-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
```

### On Linux/Mac:
```bash
openssl rand -hex 32
```

## PayNow Test Mode

For development, you can use dummy credentials:
```bash
PAYNOW_INTEGRATION_ID=0
PAYNOW_INTEGRATION_KEY=test-key-12345
PAYNOW_WEBHOOK_SECRET=test-webhook-secret
```

**Note:** These won't process real payments but will allow testing the flow.
