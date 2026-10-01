# BizPeek + n8n

O Docker Compose inicia o n8n em `http://localhost:5678` e persiste os dados no volume `bizpeek_n8n_data`.

## Primeira execução

1. Copie as três variáveis `N8N_*` de `.env.example` para `.env` e gere dois segredos longos.
2. Execute `docker compose up -d postgres n8n`.
3. Acesse `http://localhost:5678` e crie a conta proprietária local.
4. Importe `n8n/workflows/bizpeek-leads.json`.
5. Publique o workflow. A URL do webhook deve terminar em `/webhook/bizpeek-leads`.

O BizPeek envia os eventos `lead.created` e `lead.updated`. Cada requisição inclui `X-BizPeek-Event`, `X-BizPeek-Delivery` e `X-BizPeek-Signature`. A assinatura é o HMAC SHA-256 do corpo bruto usando `N8N_WEBHOOK_SECRET`.

O salvamento do lead continua funcionando quando o n8n estiver fora do ar. A entrega aguarda no máximo cinco segundos e registra a falha no log do servidor.

## IA local gratuita

Execute `powershell -ExecutionPolicy Bypass -File scripts/setup-ollama.ps1`. O script inicia o Ollama, baixa o modelo `qwen3:1.7b` e faz uma pergunta curta para validar a instalação.

Depois, importe `n8n/workflows/bizpeek-leads-ai.json` e publique esse workflow no lugar da versão inicial. O terceiro bloco envia os dados do lead para `http://ollama:11434/api/generate`, endereço acessível entre os containers do mesmo Compose.
