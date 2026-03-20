---
description: How to deploy the backend to Cloudflare
---

# Deployment Workflow

Follow these steps to deploy the wedding-api to Cloudflare.

## Prerequisites
- [x] Ensure you have a Cloudflare account.
- [x] Install Wrangler CLI: `npm install -g wrangler` (already in devDependencies).
- [x] Login to Wrangler: `npx wrangler login`.

## Deployment Steps

### 1. Initialize Production Database (First time only)
If you haven't created the database in Cloudflare yet:
```bash
npx wrangler d1 create wedding-db
```
*Note: Your `wrangler.jsonc` already has a `database_id`, so it's likely already created.*

### 2. Apply Migrations to Production
Deploy all your local migrations to the remote D1 database:
```bash
npx wrangler d1 migrations apply wedding-db --remote
```

### 3. Set Production Secrets
Sensitive information must be stored as secrets, not in `wrangler.jsonc`:
```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put R2_ACCOUNT_ID
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

### 4. Deploy the Worker
Finally, deploy the source code:
```bash
npx wrangler deploy
```

## Verification
After deployment, you can check the logs:
```bash
npx wrangler tail
```

> [!TIP]
> Make sure your `R2_PUBLIC_URL` in `wrangler.jsonc` matches your custom domain or R2.dev URL in production.