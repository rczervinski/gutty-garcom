module.exports = {
  apps: [
    {
      name: 'garcom-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3002',
      cwd: __dirname,
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        NEXT_PUBLIC_RETAGUARDA_URL: 'https://retaguarda.gutty.app.br',
        // SSL relaxado: bancos hospedados (cloudclusters etc) usam cert self-signed.
        // O banco já valida por senha + IP whitelist.
        NODE_TLS_REJECT_UNAUTHORIZED: '0',
        DB_SSL_MODE: 'no-verify',
        // MASTER_DATABASE_URL, TENANT_ENCRYPTION_KEY, AUTH_JWT_SECRET,
        // GARCOM_JWT_SECRET e FORCE_SECURE_COOKIE vêm do .env.local.
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002,
        NEXT_PUBLIC_RETAGUARDA_URL: 'https://retaguarda.gutty.app.br',
        NODE_TLS_REJECT_UNAUTHORIZED: '0',
        DB_SSL_MODE: 'no-verify',
      },
    },
  ],
}
