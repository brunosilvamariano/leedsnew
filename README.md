# Prospect v0.6.1 — Busca Global Simplificada

O Prospect pesquisa possíveis clientes em escala mundial. A interface continua em português e a localização agora segue um fluxo simples e consistente:

**País → Região/Estado → Cidade → Nicho**

## O que mudou nesta versão

- Removido o filtro de bairro/distrito do Explorar.
- Busca global agora usa apenas país, região/estado e cidade.
- A consulta ao Google Places não envia mais bairro como filtro.
- Países, subdivisões e cidades continuam carregados sob demanda pela base mundial **World Countries Cities DB**.
- Resultados continuam preservando o endereço público retornado pelo Google Places, inclusive bairro/sublocalidade quando a própria empresa tiver essa informação. Isso aparece apenas como detalhe do endereço, não como filtro.
- Busca real continua limitada a até 60 resultados por consulta do Google Places, exibidos 10 por vez na área de scroll.
- Dashboard, Radar, Leads e Favoritos continuam usando dados reais da última consulta e dos leads salvos.
- `.env` segue incluído e preenchido conforme solicitado; `.env.example` permanece removido.
- `deepmerge-ts` permanece fixado em `8.0.2` por `overrides`.

## Fontes geográficas

### Países, regiões e cidades

O Prospect usa a base pública `srestre/world-countries-cities-db`, com países/territórios, subdivisões e cidades/localidades em escala mundial.

A aplicação carrega somente o recorte necessário para o país/região escolhido, evitando colocar uma base mundial inteira no navegador.

## Empresas

As empresas são consultadas ao vivo pelo **Google Places (New)**. Não são inseridas empresas fictícias para preencher a interface.

O enriquecimento atual tenta identificar, quando publicamente disponível:

- Website
- Instagram
- WhatsApp
- Telefone
- E-mail
- Avaliação e quantidade de reviews
- Coordenadas
- Google Maps

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

```powershell
docker compose up -d postgres
```

Quando necessário:

```powershell
npm run db:generate
npm run db:migrate -- --name init
```

## Segurança

O `.env` desta entrega contém credenciais reais e está no `.gitignore`. Não publique o `.env` nem este ZIP em repositórios públicos.
