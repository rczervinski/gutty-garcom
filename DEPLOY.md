# Deploy — garcom.gutty.app.br (VPS do caixa, Lightsail Ubuntu)

Roteiro completo para subir o app na mesma VPS do caixa (IP `3.215.76.152`),
com PM2 na porta **3002** e nginx servindo o subdomínio **garcom.gutty.app.br**.

---

## 0) Subir o código pra um repositório remoto (na sua máquina)

✅ **FEITO** — o código está em `https://github.com/rczervinski/gutty-garcom`
(branch `main`, remote via HTTPS). Para atualizações futuras, da sua máquina:

```bash
cd C:/Users/Pichau/Documents/gutty/garcom
git push
```

> **Alternativa sem GitHub (rsync direto):** pule o git e envie os arquivos da
> sua máquina (Git Bash) — exclui node_modules/.next/.env.local:
> ```bash
> rsync -avz --exclude node_modules --exclude .next --exclude .env.local \
>   ./ ubuntu@3.215.76.152:/var/www/garcom-gutty/
> ```

---

## 1) Entrar na VPS e clonar

```bash
ssh ubuntu@3.215.76.152          # mesma chave/usuário que você usa pro caixa

cd /var/www
sudo mkdir -p garcom-gutty && sudo chown $USER:$USER garcom-gutty
git clone https://github.com/rczervinski/gutty-garcom.git garcom-gutty
cd garcom-gutty
```

> **Repo privado?** O clone via HTTPS vai pedir usuário + senha — a "senha" é um
> **Personal Access Token** (GitHub → Settings → Developer settings →
> Personal access tokens → Fine-grained → repo `gutty-garcom`, permissão
> *Contents: Read*). Cole o token no prompt de senha. Para o `git pull` não
> pedir de novo: `git config credential.helper store` (guarda na VPS).

## 2) Criar o .env.local REAL

Os 3 primeiros valores são **os mesmos do caixa** — copie de lá:

```bash
# ver os valores do caixa:
grep -E 'MASTER_DATABASE_URL|TENANT_ENCRYPTION_KEY|AUTH_JWT_SECRET' /var/www/caixa-gutty/.env.local

nano .env.local
```

Conteúdo:

```
MASTER_DATABASE_URL=<MESMO do caixa>
TENANT_ENCRYPTION_KEY=<MESMO do caixa>
AUTH_JWT_SECRET=<MESMO do caixa>

# segredo próprio do cookie do garçom — gere um novo:
#   openssl rand -hex 32
GARCOM_JWT_SECRET=<hex de 64 chars>

DB_SSL_MODE=no-verify
FORCE_SECURE_COOKIE=true
PORT=3002
```

> `FORCE_SECURE_COOKIE=true` só funciona depois do HTTPS (passo 6).
> Se quiser testar antes do certbot, deixe `false` e troque depois.

## 3) Build + PM2

```bash
cd /var/www/garcom-gutty
npm install
npm run build

pm2 start ecosystem.config.js --env production   # sobe "garcom-web" na :3002
pm2 save                                          # persiste no boot

# teste local:
curl -s http://127.0.0.1:3002/api/health
# → {"ok":true,"service":"garcom",...}
```

## 4) DNS — apontar o subdomínio

No mesmo painel onde você criou `caixa.gutty.app.br` (zona DNS de `gutty.app.br`):

```
Tipo: A
Nome: garcom
Valor: 3.215.76.152
TTL: 300 (ou padrão)
```

Confira a propagação: `nslookup garcom.gutty.app.br` (deve responder o IP da VPS).

## 5) Nginx — server block do subdomínio

Veja como o caixa está configurado pra espelhar o padrão:

```bash
ls /etc/nginx/sites-enabled/    # ache o arquivo do caixa e dê uma olhada
```

Crie o do garçom:

```bash
sudo nano /etc/nginx/sites-available/garcom.gutty.app.br
```

```nginx
server {
    listen 80;
    server_name garcom.gutty.app.br;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ativar e recarregar:

```bash
sudo ln -s /etc/nginx/sites-available/garcom.gutty.app.br /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

> **Lightsail:** o firewall da instância (aba Networking no console) já deve ter
> 80/443 abertos por causa do caixa — não precisa abrir a 3002 (ela fica só local).

## 6) HTTPS (certbot)

```bash
sudo certbot --nginx -d garcom.gutty.app.br
```

O certbot edita o server block sozinho (adiciona 443 + redirect). Depois:

```bash
# garanta cookies seguros:
grep FORCE_SECURE_COOKIE /var/www/garcom-gutty/.env.local   # = true
pm2 restart garcom-web
```

## 7) Smoke test final

1. `https://garcom.gutty.app.br` → tela **GUTTY PEDIDOS** (login da empresa)
2. Login da empresa (mesma credencial do caixa) → login do garçom (código ou nome + senha)
3. Anotar um pedido de teste numa comanda → conferir que aparece no **caixa**
   (comandas abertas / `pedidos_terminal` com `status=0`)
4. `pm2 logs garcom-web --lines 50` pra ver se não há erro

## 8) Atualizações futuras

```bash
cd /var/www/garcom-gutty
git pull
npm install            # só se o package.json mudou
npm run build
pm2 reload garcom-web
```

---

## Troubleshooting rápido

| Sintoma | Verificar |
|---|---|
| 502 Bad Gateway | `pm2 status` (garcom-web online?), `curl 127.0.0.1:3002/api/health` |
| Login da empresa falha | `AUTH_JWT_SECRET`/`MASTER_DATABASE_URL`/`TENANT_ENCRYPTION_KEY` idênticos aos do caixa? |
| `tenants_not_configured` | `MASTER_DATABASE_URL` errada ou banco master inacessível — `pm2 logs garcom-web` |
| Cookie não persiste | HTTPS ativo? `FORCE_SECURE_COOKIE=true` só com HTTPS |
| Build estoura memória | VPS pequena: crie swap — `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile` |
