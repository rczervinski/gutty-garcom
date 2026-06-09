# Gutty Garçom (`garcom.gutty.app.br`)

Microserviço web para **anotação de pedidos** (sem pagamento). Porta o app Android `app-cielo/GuttyCielo` (terminal Cielo LIO) para a stack do `caixa` (Next.js 15 multi-tenant), gravando na mesma tabela `pedidos_terminal`.

> Mapeamento completo e plano: `../PLANO_GARCOM.md`.

## Stack
- Next.js 15 (App Router) + TypeScript + Tailwind
- Postgres via `pg` (sem ORM), multi-tenant (mesmo banco master do caixa)
- Auth em 2 camadas: **empresa** (cookie `AUTH_TOKEN`, compartilhado com o caixa) + **vendedor** (cookie `GARCOM_VENDEDOR`)

## Como funciona a sessão
1. `/login` → login da **empresa** (`clientes_web`, mesmo do caixa). Emite `AUTH_TOKEN`.
2. `/garcom/login` → login do **vendedor** por **código + senha** (`vendedores`). Emite `GARCOM_VENDEDOR`.
3. `/garcom` → menu: Anotar pedido · Comandas abertas · Unir comandas.

O `middleware.ts` exige `AUTH_TOKEN` em tudo (menos `/login` e auth APIs) e redireciona páginas `/garcom/*` para `/garcom/login` quando falta o cookie do vendedor. As rotas `/api/garcom/*` validam o vendedor via `withGarcom`.

## Endpoints
| Método | Rota | Função |
|---|---|---|
| POST | `/api/auth/login` | login empresa |
| POST | `/api/garcom/vendedor/login` | login vendedor (código+senha) |
| GET | `/api/garcom/categorias` | categorias do cardápio |
| GET | `/api/garcom/produtos?categoria=` | produtos da categoria |
| GET | `/api/garcom/proxima-comanda` | próximo nº de comanda |
| GET | `/api/garcom/comandas` | comandas abertas / `?numero=` itens |
| POST | `/api/garcom/comandas` | grava pedido (lote) — `pedidos_terminal` status=0 |
| PUT | `/api/garcom/comandas` | substitui itens de uma comanda |
| GET/POST | `/api/garcom/merge` | merges recentes / unir |
| POST | `/api/garcom/merge/desfazer` | desfaz merge |

## Rodar local
```bash
cp .env.local.example .env.local   # preencher com os MESMOS valores do caixa
npm install
npm run dev                        # http://localhost:3002
```

### Variáveis (.env.local)
Devem casar com o app `caixa`:
- `MASTER_DATABASE_URL` — banco master (`clientes_web`)
- `TENANT_ENCRYPTION_KEY` — hex 64 chars (decripta `db_url_enc`)
- `AUTH_JWT_SECRET` — **mesmo do caixa** (login de empresa compartilhado)
- `GARCOM_JWT_SECRET` — segredo do cookie do vendedor (pode reusar o de cima)
- `DB_SSL_MODE=no-verify`, `FORCE_SECURE_COOKIE=true` (em prod com HTTPS)

## Deploy (VPS Lightsail Ubuntu, mesma do caixa)
```bash
# 1. Código
cd /var/www && git clone <repo> garcom-gutty && cd garcom-gutty
cp .env.local.example .env.local   # preencher
npm install && npm run build

# 2. PM2 (porta 3002)
pm2 start ecosystem.config.js --env production
pm2 save

# 3. Nginx — garcom.gutty.app.br → localhost:3002
#    (espelhar o server block do caixa, trocando porta e server_name)

# 4. DNS: A record garcom.gutty.app.br → IP da VPS
# 5. HTTPS: certbot --nginx -d garcom.gutty.app.br  (depois FORCE_SECURE_COOKIE=true)
```

## Não portado (fica no caixa / C legado)
Pagamento, divisão de pagamento e impressão térmica Cielo (`lio://print`). O garçom só cria pedidos com `status=0`; o fechamento/pagamento é feito no caixa.
