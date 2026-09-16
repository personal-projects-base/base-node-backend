# Base Node Backend

Template de API Node.js em TypeScript preparado para receber código gerado pelo
Gonthera CLI 2.1.4. A aplicação inclui Express 5, Prisma com MongoDB por padrão,
clientes nativos opcionais para MongoDB e PostgreSQL, RabbitMQ, Swagger, Docker e
encerramento controlado.

## O que está pronto

- `src/app.ts`: Express, health check, Swagger, rotas próprias, rotas geradas e erros;
- `src/server.ts`: conexão da infraestrutura, servidor HTTP e graceful shutdown;
- `src/configuration/database`: Prisma, pool PostgreSQL nativo e MongoDB;
- `src/messaging`: configuração concreta e ciclo de vida do RabbitMQ;
- `src/middleware`: interceptor global, rate limit e tratamento uniforme de erros;
- `src/generated/documentation/openapi.ts`: CRUD e contratos OpenAPI gerados;
- `.gonthera`: exemplo mínimo de entidade, endpoints, enums, mensageria e autorização;
- `Dockerfile` e `docker-compose.yml`: API e MongoDB em replica set;
- `.env.example`: todas as variáveis necessárias, sem credenciais de produção.

O CRUD gerado pelo Gonthera 2.1.4 usa Prisma com MongoDB nesta base. O provider é
definido em `.gonthera/project.json`; alterar apenas `DATABASE_URL` não troca o
provider. Consulte [Configuração de bancos](BANCOS-DE-DADOS.md) para usar
PostgreSQL, o provider relacional oficialmente suportado.

## Primeiro uso local

Requisitos: Node.js 20.19 ou superior e Java 11 ou superior.

```bash
cp .env.example .env
npm install
npm run gonthera-validate
npm run gonthera-cli
npm run prisma:generate
docker compose up -d mongodb
npm run prisma:push
npm run dev
```

Neste workspace, o script procura o JAR em
`.gonthera/gonthera-cli-2.1.4.jar`. Ao copiar este diretório para outro repositório,
coloque o JAR nesse caminho ou ajuste os scripts `gonthera-cli` e
`gonthera-validate` no `package.json`.

A API abre em `http://127.0.0.1:3000`, o Swagger em `/docs` e o documento OpenAPI
em `/openapi.json`. O exemplo inicial gera CRUD em `/example` e `/example/:id`.

O Gonthera recria automaticamente paths, filtros e schemas OpenAPI quando os JSONs
de `.gonthera` mudam. `src/documentation/openapi.ts` mescla apenas informações da
aplicação, como título, health check, segurança, servidores e rotas manuais.

O MongoDB precisa operar como replica set para suportar as transações dos
repositories gerados. O serviço do Compose configura o replica set `rs0`
automaticamente para desenvolvimento local.

## Executar tudo com Docker

Gere os fontes antes do primeiro build, pois `src/generated` e
`prisma/schema.prisma` são resultados do Gonthera:

```bash
npm run gonthera-cli
docker compose up --build
```

O entrypoint da API executa `prisma db push` antes de abrir a porta HTTP. A variável
`PRISMA_DEPLOY_MODE` permite selecionar `push`, `migrate` ou `none`; use `migrate`
com PostgreSQL e migrations já versionadas.

## Bancos de dados

`AppDatabaseConfig` estende a configuração Prisma abstrata gerada e alimenta todo o
CRUD padrão. A URL vem de `DATABASE_URL`; por padrão ela aponta para o MongoDB.

`AppPostgresConfig` oferece um `pg.Pool` para SQL específico da aplicação. Ele só é
conectado no bootstrap quando `POSTGRES_NATIVE_ENABLED=true`; acesse
`postgres.client` em código manual. A conexão nativa usa `POSTGRES_URL`; quando o
Prisma também usa PostgreSQL, pode reutilizar uma `DATABASE_URL` PostgreSQL.

`AppMongoDatabaseConfig` disponibiliza um cliente nativo adicional em
`mongodb.client` e `mongodb.database`. Ele só é conectado quando
`MONGODB_ENABLED=true` e não é necessário para o CRUD Prisma. Customize pool,
autenticação ou seleção de banco sobrescrevendo os métodos protegidos da classe
base.

## RabbitMQ

O contrato inicial gera o publisher `EntityChangedPub`. Para habilitar a conexão no
bootstrap, configure `RABBITMQ_ENABLED=true`. Publishers e subscribers adicionais
são declarados em `.gonthera/messaging.json`; implementações concretas de subscribers
devem permanecer em `src/messaging`, fora da pasta gerada.

## Pipeline HTTP

Todas as requisições passam pelo `requestInterceptor` antes do parser JSON e das
rotas. O interceptor aceita um `X-Request-Id` válido ou gera um UUID, devolve esse
identificador no response header e registra um log JSON ao concluir a resposta.
Defina `REQUEST_LOG_ENABLED=false` para desativar somente o log; a identificação da
requisição permanece ativa.

O rate limit global permite 100 requisições por IP a cada 60 segundos por padrão e
responde com HTTP 429 ao exceder o limite. Configure por ambiente:

```dotenv
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
TRUST_PROXY_HOPS=0
```

`TRUST_PROXY_HOPS` deve representar exatamente a quantidade de proxies reversos
confiáveis antes da API. Uma configuração incorreta permite falsificação do IP usado
pelo rate limit. O store padrão fica em memória e atende uma única instância; em uma
implantação com múltiplas réplicas, substitua-o por um store externo compartilhado.

## Fluxo de desenvolvimento

Edite os JSONs de `.gonthera` e execute:

```bash
npm run gonthera-validate
npm run gonthera-cli
npm run prisma:push
npm run typecheck
```

O Gonthera recria `src/generated` e `prisma/schema.prisma`. Mantenha controllers
customizados, regras de negócio, configuração concreta e rotas próprias fora desses
caminhos. No PostgreSQL, substitua `prisma:push` por `prisma:migrate` e versione as
migrations em `prisma/migrations`.

Quando usar `controllerAbstract: true`, crie a subclasse concreta fora de
`src/generated`, registre sua factory em um arquivo da aplicação e passe o registro
como segundo argumento de `createGeneratedRoutes`. As rotas CRUD continuam geradas.

## Estrutura

```text
base-node-backend/
├── .gonthera/
├── docs/
│   ├── BANCOS-DE-DADOS.md
│   └── README.md
├── prisma/
│   ├── migrations/
│   └── schema.prisma              # gerado
├── src/
│   ├── configuration/database/
│   ├── controllers/               # controllers customizados
│   ├── documentation/
│   ├── generated/                 # gerado
│   ├── messaging/
│   ├── middleware/
│   ├── models/                    # modelos exclusivos da aplicação
│   ├── repositories/              # persistência customizada, inclusive MongoDB
│   ├── routes/
│   ├── services/                  # regras de negócio
│   ├── app.ts
│   └── server.ts
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```
