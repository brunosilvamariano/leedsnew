# Prospect v0.5.2 — Premium + revisão técnica

Esta versão é baseada no projeto completo enviado pelo usuário e mantém a direção visual aprovada: azul premium, cinza fosco, superfícies em gelo, ícones com acentos de cor e Dashboard Bento com dados reais.

## Revisões desta entrega

- Projeto revisado sem recriar a base do zero.
- `.env` incluído e já preenchido com a configuração recebida no projeto.
- `.env.example` e `.env.local` removidos para evitar duplicidade de configuração.
- `.env` continua protegido pelo `.gitignore` e não deve ser enviado ao GitHub.
- Workaround de segurança adicionado em `package.json` para `deepmerge-ts@8.0.2`, corrigindo o alerta transitivo vindo de `prisma -> @prisma/config -> deepmerge-ts`.
- `package-lock.json` alinhado com a versão segura de `deepmerge-ts`.
- TypeScript e ESLint revisados; os arquivos do projeto passam nas verificações estáticas realizadas nesta revisão.
- Sidebar recolhível preservada.
- Ilustração que sobrepunha o bloco de data/frase do Dashboard permanece removida.
- Busca real do Google Places preservada.
- Cidades continuam vindo do IBGE.
- Bairros usam o índice sincronizado do IBGE e fallbacks já existentes no projeto; quando uma cidade não possui bairros oficiais na malha do IBGE, o campo continua aceitando digitação manual.
- Resultados do Explorar permanecem em uma área com scroll próprio, mostrando 10 empresas por vez.

## Executar

No PowerShell, dentro da pasta do projeto:

```powershell
npm install
npm run dev
```

Abra:

```text
http://localhost:3000
```

## Banco local

O `.env` está alinhado ao `docker-compose.yml` incluído no projeto. Para subir o PostgreSQL local:

```powershell
docker compose up -d postgres
```

Depois, quando for necessário trabalhar com o schema:

```powershell
npm run db:generate
npm run db:migrate -- --name init
```

## Bairros

O `postinstall` executa automaticamente:

```powershell
npm run locations:sync
```

Para forçar uma nova sincronização manual:

```powershell
npm run locations:sync
```

O índice oficial do IBGE não possui bairros formais para todos os municípios brasileiros. Por isso o Prospect mantém fallbacks e permite digitar o bairro diretamente quando necessário.

## Segurança

O arquivo `.env` desta entrega contém credenciais reais e deve ser tratado como privado. Ele está ignorado pelo Git, mas não publique este ZIP em repositórios públicos.

A correção para o alerta atual do `npm audit` foi aplicada por `overrides` em `package.json`:

```json
"overrides": {
  "deepmerge-ts": "8.0.2"
}
```

Após `npm install`, confirme no seu Windows:

```powershell
npm audit
npm audit --omit=dev
```

## Dados do Dashboard

O Dashboard não usa empresas fictícias. Ele lê a última consulta real, histórico real de buscas e leads/favoritos persistidos pelo Prospect no navegador. Métricas sem eventos reais permanecem em zero ou em estado vazio.
