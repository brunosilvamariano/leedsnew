import fs from 'node:fs';import crypto from 'node:crypto';
if(fs.existsSync('.env')){console.log('.env já existe e foi preservado.');process.exit(0);}
const password=crypto.randomBytes(20).toString('hex');
fs.writeFileSync('.env',`DATABASE_URL="postgresql://bizpeek:${password}@localhost:5433/bizpeek"\nDIRECT_URL="postgresql://bizpeek:${password}@localhost:5433/bizpeek"\nPOSTGRES_PASSWORD="${password}"\nBETTER_AUTH_URL="http://localhost:3000"\nBETTER_AUTH_SECRET="${crypto.randomBytes(48).toString('base64')}"\nBILLING_ENABLED="false"\nREQUIRE_EMAIL_VERIFICATION="false"\nSEARCH_DAILY_LIMIT="20"\nGOOGLE_CLIENT_ID=""\nGOOGLE_CLIENT_SECRET=""\nGOOGLE_PLACES_API_KEY=""\nRESEND_API_KEY=""\nEMAIL_FROM=""\nSTRIPE_SECRET_KEY=""\nSTRIPE_PRICE_ID=""\nSTRIPE_WEBHOOK_SECRET=""\n`);
console.log('.env local criado com credenciais aleatórias. Não publique esse arquivo.');
