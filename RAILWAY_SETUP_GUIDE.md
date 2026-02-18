# 🚀 Guia de Deploy no Railway - Passo a Passo

## ✅ O que você precisa

1. Conta no Railway (já criada)
2. Email: raed.investimentos@gmail.com
3. Variáveis de ambiente (vou listar abaixo)

## 📋 Passo 1: Criar um Repositório no GitHub (5 minutos)

Se você não tem GitHub:

1. Acesse https://github.com
2. Clique em "Sign up"
3. Use o email: raed.investimentos@gmail.com
4. Crie uma senha
5. Confirme o email

Se já tem GitHub:

1. Acesse https://github.com/new
2. Nome do repositório: `energy-farm`
3. Descrição: `NFT-based energy farm game`
4. Deixe como "Public"
5. Clique em "Create repository"

## 📋 Passo 2: Fazer Push do Código para GitHub

Depois de criar o repositório, você vai ver instruções. Siga estas:

```bash
cd /home/ubuntu/energy_farm

# Remover remote antigo
git remote remove origin

# Adicionar novo remote (substitua SEU_USUARIO)
git remote add origin https://github.com/SEU_USUARIO/energy-farm.git

# Fazer push
git branch -M main
git push -u origin main
```

## 📋 Passo 3: Conectar Railway ao GitHub

1. Acesse https://railway.app/dashboard
2. Clique em "New Project"
3. Selecione "Deploy from GitHub"
4. Autorize o Railway a acessar seu GitHub
5. Selecione o repositório `energy-farm`
6. Railway vai começar o build automaticamente

## 📋 Passo 4: Adicionar Banco de Dados

1. No dashboard do Railway, clique em "Add"
2. Selecione "PostgreSQL"
3. Aguarde o banco ser criado

## 📋 Passo 5: Configurar Variáveis de Ambiente

1. No dashboard do Railway, vá para a aba "Variables"
2. Clique em "Add Variable"
3. Adicione cada uma das variáveis abaixo:

### Banco de Dados
```
DATABASE_URL=postgresql://... (Railway vai gerar automaticamente)
```

### Node.js
```
NODE_ENV=production
PORT=3000
```

### OAuth / Manus
```
VITE_APP_ID=seu_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://app.manus.im
JWT_SECRET=seu_jwt_secret
```

### Owner
```
OWNER_NAME=Raed Investimentos
OWNER_OPEN_ID=seu_open_id
```

### Blockchain
```
BLOCKCHAIN_SEED_PHRASE=sua_seed_phrase
BEP20_RPC_ENDPOINT=https://bsc-dataseed.binance.org:443
TON_ENDPOINT=https://toncenter.com/api/v2/jsonRPC
```

### Admin
```
ADMIN_PASSWORD=sua_senha_admin
```

### Manus APIs
```
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=sua_chave
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=sua_chave
```

### Analytics
```
VITE_ANALYTICS_ENDPOINT=https://analytics.manus.im
VITE_ANALYTICS_WEBSITE_ID=seu_id
```

### App
```
VITE_APP_TITLE=Energy Farm - NFT Game
VITE_APP_LOGO=/logo.png
```

## 📋 Passo 6: Aguardar o Deploy

1. Railway vai detectar o `Dockerfile` automaticamente
2. Vai fazer o build (leva ~5-10 minutos)
3. Quando terminar, você terá uma URL como: `https://energy-farm-production.up.railway.app`

## ✅ Pronto!

Seu site está online! Acesse a URL gerada pelo Railway.

## 🔗 Domínio Customizado (Opcional)

Se quiser usar seu próprio domínio (ex: energyfarm.com):

1. No Railway, vá para "Settings"
2. Clique em "Custom Domain"
3. Adicione seu domínio
4. Configure os DNS records no seu provedor de domínio

## 🆘 Troubleshooting

### Erro: "Build failed"
- Verifique os logs em "Deployments" > "Logs"
- Certifique-se que `pnpm build` funciona localmente

### Erro: "Database connection failed"
- Verifique se `DATABASE_URL` está correto
- Aguarde o banco de dados estar pronto

### Erro: "Port already in use"
- Railway atribui portas automaticamente
- Não precisa configurar manualmente

### Site carrega mas dá erro 404
- Verifique se `DATABASE_URL` está correto
- Verifique se as variáveis de OAuth estão corretas

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs do Railway
2. Consulte: https://docs.railway.app
3. Contate o suporte do Railway
