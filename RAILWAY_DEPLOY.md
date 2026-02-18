# Deploy no Railway

## Pré-requisitos

1. Conta no Railway (https://railway.app)
2. Conta no GitHub
3. Variáveis de ambiente configuradas

## Passo a Passo

### 1. Conectar GitHub ao Railway

1. Acesse https://railway.app/dashboard
2. Clique em "New Project"
3. Selecione "Deploy from GitHub"
4. Autorize o Railway a acessar seu GitHub
5. Selecione o repositório `energy_farm`

### 2. Configurar Banco de Dados

1. No dashboard do Railway, clique em "Add"
2. Selecione "PostgreSQL"
3. Railway vai criar um banco de dados automaticamente
4. Copie a `DATABASE_URL` que aparece

### 3. Configurar Variáveis de Ambiente

1. No dashboard do Railway, vá para "Variables"
2. Adicione as seguintes variáveis:

```
DATABASE_URL=postgresql://... (copie do passo anterior)
NODE_ENV=production
PORT=3000

# OAuth / Manus
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://app.manus.im
JWT_SECRET=your_jwt_secret

# Owner
OWNER_NAME=Raed Investimentos
OWNER_OPEN_ID=your_open_id

# Blockchain
BLOCKCHAIN_SEED_PHRASE=your_seed_phrase
BEP20_RPC_ENDPOINT=https://bsc-dataseed.binance.org:443
TON_ENDPOINT=https://toncenter.com/api/v2/jsonRPC

# Admin
ADMIN_PASSWORD=your_admin_password

# Manus APIs
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=your_key

# Analytics
VITE_ANALYTICS_ENDPOINT=https://analytics.manus.im
VITE_ANALYTICS_WEBSITE_ID=your_id

# App
VITE_APP_TITLE=Energy Farm - NFT Game
VITE_APP_LOGO=/logo.png
```

### 4. Deploy

1. Railway vai detectar o `Dockerfile` automaticamente
2. Clique em "Deploy"
3. Aguarde o build completar (leva ~5 minutos)
4. Quando terminar, você terá uma URL pública como `https://energy-farm-production.up.railway.app`

### 5. Banco de Dados

O Railway vai executar automaticamente as migrações do Drizzle. Se não executar:

1. Vá para "Deployments"
2. Clique na aba "Logs"
3. Procure por erros de migração

Se precisar executar manualmente:
```bash
pnpm db:push
```

## Domínio Customizado

1. No Railway, vá para "Settings"
2. Clique em "Custom Domain"
3. Adicione seu domínio (ex: energyfarm.com)
4. Configure os DNS records conforme instruído

## Troubleshooting

**Erro: "Could not find the build directory"**
- Certifique-se que o `pnpm build` está funcionando localmente
- Verifique se `dist/public/index.html` existe após o build

**Erro: "Database connection failed"**
- Verifique se `DATABASE_URL` está correto
- Certifique-se que o banco de dados está rodando
- Verifique as credenciais

**Erro: "Port already in use"**
- Railway vai automaticamente atribuir uma porta
- Não precisa configurar manualmente

## Monitoramento

1. Vá para "Deployments" para ver o histórico
2. Clique em "Logs" para ver os logs em tempo real
3. Clique em "Metrics" para ver CPU, memória, etc

## Rollback

Se algo der errado:

1. Vá para "Deployments"
2. Clique no deployment anterior
3. Clique em "Redeploy"

## Suporte

Se tiver problemas:
- Verifique os logs em "Deployments" > "Logs"
- Consulte a documentação do Railway: https://docs.railway.app
