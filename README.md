# Base Node Backend

Template de API Node.js em TypeScript preparado para receber código gerado pelo
Gonthera CLI 2.1.4. O projeto usa MongoDB como provider padrão e mantém PostgreSQL
como alternativa relacional oficialmente suportada pelo gerador.

## Recursos incluídos

- Express 5 com encerramento controlado;
- Gonthera CLI 2.1.4 e Prisma 5.22;
- MongoDB em replica set para suportar transações;
- PostgreSQL e clientes nativos opcionais;
- script interativo para personalizar uma cópia do template;
- validação central das variáveis de ambiente com Zod;
- interceptor global com `X-Request-Id`;
- logs JSON estruturados e redaction com Pino;
- Helmet, CORS e rate limit globais;
- tratamento uniforme de erros;
- OpenAPI e Swagger UI;
- infraestrutura opcional para RabbitMQ;
- Dockerfile e Docker Compose para API e MongoDB.

## Requisitos

- Node.js 20.19 ou superior;
- Java 11 ou superior;
- Docker com Docker Compose para o ambiente local recomendado;
- JAR `gonthera-cli-2.1.4.jar` em `.gonthera/`.

O gerador é distribuído como JAR, não como pacote npm. Caso ele seja armazenado em
outro local, ajuste os scripts `gonthera-cli` e `gonthera-validate` no
`package.json`.

## Primeiro uso

Instale as dependências e personalize a cópia do template:

```bash
npm install
npm run setup
```

O setup solicita nome técnico, nome de exibição, `mainPackage`, nome do banco,
porta HTTP e exchange RabbitMQ. Ele atualiza os arquivos de configuração e cria
`.env` quando esse arquivo ainda não existe.

Depois, valide e gere o código do Gonthera:

```bash
npm run gonthera-validate
npm run gonthera-cli
npm run prisma:validate
npm run prisma:generate
```

Inicie o MongoDB, aplique o schema e execute a API:

```bash
docker compose up -d mongodb
npm run prisma:push
npm run dev
```

Por padrão, ficam disponíveis:

- API: `http://127.0.0.1:3000`;
- health check: `http://127.0.0.1:3000/health`;
- Swagger UI: `http://127.0.0.1:3000/docs`;
- OpenAPI JSON: `http://127.0.0.1:3000/openapi.json`;
- CRUD de exemplo: `/example` e `/example/:id`.

## Personalizar sem interação

O setup também aceita todos os valores por argumentos:

```bash
npm run setup -- \
  --name minha-api \
  --display-name "Minha API" \
  --main-package com.empresa.minhaapi \
  --database minha_api \
  --port 3000 \
  --exchange minha.api.events
```

Arquivos atualizados pelo setup:

- `package.json` e `package-lock.json`;
- `.gonthera/project.json`;
- `.env.example`;
- `README.md`;
- `.env`, somente quando ele ainda não existe.

Um `.env` existente é preservado. Passe `--overwrite-env` apenas quando quiser
substituí-lo integralmente pelo `.env.example` recém-configurado.

O setup mantém MongoDB como provider padrão. Para usar PostgreSQL, siga
[Configuração de banco de dados](docs/BANCOS-DE-DADOS.md).

## Configuração do ambiente

O módulo `src/configuration/environment.ts` valida o ambiente com Zod antes de
iniciar bancos, mensageria ou servidor HTTP. Valores inválidos interrompem o
bootstrap e identificam as variáveis que precisam ser corrigidas.

Principais grupos disponíveis em `.env.example`:

| Grupo | Variáveis |
| --- | --- |
| Aplicação | `NODE_ENV`, `APP_NAME`, `APP_DISPLAY_NAME`, `HOST`, `PORT` |
| Logging | `LOG_LEVEL`, `REQUEST_LOG_ENABLED` |
| Segurança | `HELMET_ENABLED`, `CORS_ENABLED`, `CORS_ORIGINS`, `CORS_CREDENTIALS` |
| Rate limit | `RATE_LIMIT_ENABLED`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` |
| Proxy | `TRUST_PROXY_HOPS` |
| Prisma | `DATABASE_URL`, `PRISMA_DEPLOY_MODE` |
| PostgreSQL nativo | `POSTGRES_NATIVE_ENABLED`, `POSTGRES_URL`, `POSTGRES_POOL_MAX` |
| MongoDB nativo | `MONGODB_ENABLED`, `MONGODB_URL`, `MONGODB_DATABASE` |
| RabbitMQ | `RABBITMQ_ENABLED`, `RABBITMQ_URL`, `RABBITMQ_EXCHANGE` |

`TRUST_PROXY_HOPS` deve representar exatamente a quantidade de proxies reversos
confiáveis entre o cliente e a API. Mantenha `0` quando não houver proxy.

## Pipeline HTTP

Toda requisição passa pela seguinte sequência:

1. interceptor e atribuição do `X-Request-Id`;
2. headers de segurança do Helmet;
3. validação de CORS;
4. rate limit;
5. parser JSON com limite de 1 MB;
6. rotas manuais e geradas;
7. resposta 404 ou middleware uniforme de erros.

### Interceptor e logs

O interceptor preserva um `X-Request-Id` válido recebido do cliente ou gera um UUID.
O mesmo identificador é devolvido no response header e incluído nos logs da
requisição e nos erros.

Pino escreve logs JSON com nome do serviço, ambiente, nível, método, caminho, status,
duração e IP. Campos comuns de senha, token, autorização e cookie são censurados.
Use `LOG_LEVEL` para controlar o nível e `REQUEST_LOG_ENABLED=false` para desativar
somente o log de acesso.

### Helmet e CORS

Helmet adiciona os headers de segurança e usa uma política CSP compatível com o
Swagger UI. O CORS aceita as origens listadas em `CORS_ORIGINS`, separadas por
vírgula:

```dotenv
HELMET_ENABLED=true
CORS_ENABLED=true
CORS_ORIGINS="http://localhost:4200,http://localhost:5173"
CORS_CREDENTIALS=false
```

Não combine `CORS_CREDENTIALS=true` com origem `*`; a validação de ambiente rejeita
essa configuração.

### Rate limit

O padrão permite 100 requisições por IP a cada 60 segundos e responde HTTP 429 ao
exceder o limite:

```dotenv
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

O store padrão fica em memória e é adequado para uma única instância. Uma futura
implantação com múltiplas réplicas deverá usar um store externo compartilhado.

## Gonthera e código gerado

Os contratos do domínio são declarados em `.gonthera`:

```text
.gonthera/
├── project.json
├── entities.json
├── endpoints.json
├── enums.json
└── messaging.json
```

Ao executar `npm run gonthera-cli`, o gerador recria integralmente:

- `src/generated`;
- `prisma/schema.prisma`.

Nunca faça customizações permanentes nesses caminhos. Controllers próprios, regras
de negócio, middleware, configuração concreta, repositories customizados e rotas
manuais devem permanecer fora de `src/generated`.

Quando `controllerAbstract: true`, crie a subclasse concreta fora da pasta gerada e
registre sua factory no segundo argumento de `createGeneratedRoutes`. Não repita os
bindings HTTP gerados.

Autenticação e autorização no Node.js são responsabilidades da aplicação consumidora
e não são geradas pelo Gonthera CLI 2.1.4.

## Bancos de dados

O CRUD gerado usa a instância Prisma de `AppDatabaseConfig` e lê `DATABASE_URL`.
MongoDB é selecionado explicitamente em `.gonthera/project.json`; trocar somente a
URL não altera o provider do schema.

MongoDB precisa operar como replica set porque os repositories gerados usam
transações. O Compose configura automaticamente o replica set `rs0` para o ambiente
local. MongoDB standalone falha durante operações transacionais.

Clientes nativos são opcionais e destinados apenas a módulos customizados:

- `MONGODB_ENABLED=true` habilita `mongodb.client` e `mongodb.database`;
- `POSTGRES_NATIVE_ENABLED=true` habilita o pool `postgres.client`;
- o pool PostgreSQL usa `POSTGRES_URL` ou reutiliza `DATABASE_URL` quando ela já for
  PostgreSQL.

Para detalhes de MongoDB, PostgreSQL, migrations e troca de provider, consulte
[Configuração de banco de dados](docs/BANCOS-DE-DADOS.md).

## RabbitMQ

O contrato inicial gera o publisher `EntityChangedPub`. Para conectar a aplicação,
configure `RABBITMQ_ENABLED=true`, uma `RABBITMQ_URL` válida e o exchange.

Publishers e subscribers adicionais são declarados em `.gonthera/messaging.json`.
Listeners e implementações concretas de subscribers pertencem a `src/messaging`,
fora da pasta gerada.

## Desenvolvimento

Depois de alterar arquivos em `.gonthera`, execute:

```bash
npm run gonthera-validate
npm run gonthera-cli
npm run prisma:validate
npm run prisma:generate
npm run prisma:push
npm run typecheck
```

O último comando de banco depende do provider:

- MongoDB: `npm run prisma:push`;
- PostgreSQL em desenvolvimento: `npm run prisma:migrate -- --name descricao`;
- PostgreSQL em produção: `npm run prisma:deploy`.

Prisma Migrate não suporta MongoDB. As migrations existentes em
`prisma/migrations` pertencem ao fluxo PostgreSQL.

## Docker

Gere os fontes antes do primeiro build, pois eles não são substituídos pelo
Dockerfile:

```bash
npm run gonthera-cli
docker compose up --build
```

O entrypoint usa `PRISMA_DEPLOY_MODE`:

- `push`: executa `prisma db push`, padrão MongoDB;
- `migrate`: executa `prisma migrate deploy`, para PostgreSQL;
- `none`: inicia sem sincronizar o schema.

O MongoDB do Compose é voltado ao desenvolvimento local, não configura autenticação
e publica sua porta apenas no loopback da máquina.

## Scripts principais

| Script | Finalidade |
| --- | --- |
| `npm run setup` | Personalizar uma cópia do template |
| `npm run gonthera-validate` | Validar os contratos `.gonthera` |
| `npm run gonthera-cli` | Regerar fontes e schema Prisma |
| `npm run prisma:validate` | Validar o schema Prisma |
| `npm run prisma:generate` | Gerar o Prisma Client |
| `npm run prisma:push` | Aplicar schema MongoDB |
| `npm run prisma:migrate` | Criar migration PostgreSQL |
| `npm run prisma:deploy` | Aplicar migrations PostgreSQL versionadas |
| `npm run dev` | Executar em desenvolvimento com watch |
| `npm run typecheck` | Verificar TypeScript sem emitir arquivos |
| `npm run build` | Gerar Prisma Client e compilar a aplicação |
| `npm start` | Executar a compilação em `dist` |

## Estrutura

```text
base-node-backend/
├── .gonthera/                     # contratos do gerador e JAR local
├── docs/
│   └── BANCOS-DE-DADOS.md
├── prisma/
│   ├── migrations/                # PostgreSQL
│   └── schema.prisma              # gerado
├── scripts/
│   └── setup.mjs
├── src/
│   ├── configuration/
│   │   ├── database/
│   │   ├── environment.ts
│   │   └── logger.ts
│   ├── documentation/
│   ├── generated/                 # descartável e gerado
│   ├── messaging/
│   ├── middleware/
│   ├── routes/
│   ├── app.ts
│   └── server.ts
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── docker-entrypoint.sh
├── package.json
└── tsconfig.json
```
