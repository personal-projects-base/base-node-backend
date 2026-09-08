# Base Node Backend

Template de API Node.js em TypeScript preparado para receber código gerado pelo
Gonthera CLI 2.1.3. A aplicação inclui Express 5, Prisma/PostgreSQL, cliente nativo
PostgreSQL, cliente MongoDB, RabbitMQ, Swagger, Docker e encerramento controlado.

## O que está pronto

- `src/app.ts`: Express, health check, Swagger, rotas próprias, rotas geradas e erros;
- `src/server.ts`: conexão da infraestrutura, servidor HTTP e graceful shutdown;
- `src/configuration/database`: Prisma, pool PostgreSQL nativo e MongoDB;
- `src/messaging`: configuração concreta e ciclo de vida do RabbitMQ;
- `src/generated/documentation/openapi.ts`: CRUD e contratos OpenAPI gerados;
- `.gonthera`: exemplo mínimo de entidade, endpoints, enums, mensageria e autorização;
- `Dockerfile` e `docker-compose.yml`: API, PostgreSQL, MongoDB e RabbitMQ Management;
- `.env.example`: todas as variáveis necessárias, sem credenciais de produção.

O CRUD gerado pelo Gonthera 2.1.3 usa Prisma com PostgreSQL. O MongoDB desta base
é um cliente adicional pronto para repositories ou módulos escritos pela aplicação.
Ativar `MONGODB_ENABLED` não converte automaticamente os repositories gerados para
MongoDB.

## Primeiro uso local

Requisitos: Node.js 20.19 ou superior e Java 11 ou superior.

```bash
cp .env.example .env
npm install
npm run gonthera-validate
npm run gonthera-cli
npm run prisma:generate
docker compose up -d postgres mongodb rabbitmq
npm run prisma:deploy
npm run dev
```

Neste workspace, o script procura o JAR em
`../target/gonthera-cli-2.1.3.jar`. Ao copiar este diretório para outro repositório,
coloque o JAR em um local estável e ajuste os scripts `gonthera-cli` e
`gonthera-validate` no `package.json`.

A API abre em `http://127.0.0.1:3000`, o Swagger em `/docs` e o documento OpenAPI
em `/openapi.json`. O exemplo inicial gera CRUD em `/example` e `/example/:id`.

O Gonthera recria automaticamente paths, filtros e schemas OpenAPI quando os JSONs
de `.gonthera` mudam. `src/documentation/openapi.ts` mescla apenas informações da
aplicação, como título, health check, segurança, servidores e rotas manuais.

## Executar tudo com Docker

Gere os fontes antes do primeiro build, pois `src/generated` e
`prisma/schema.prisma` são resultados do Gonthera:

```bash
npm run gonthera-cli
docker compose up --build
```

O entrypoint da API executa `prisma migrate deploy` antes de abrir a porta HTTP.
RabbitMQ Management fica em `http://localhost:15672`. As credenciais do Compose são
somente para desenvolvimento e devem ser substituídas em qualquer ambiente real.

## Bancos de dados

`AppDatabaseConfig` estende a configuração Prisma abstrata gerada e alimenta todo o
CRUD padrão. A URL vem de `DATABASE_URL`.

`AppPostgresConfig` oferece um `pg.Pool` para SQL específico da aplicação. Ele só é
conectado no bootstrap quando `POSTGRES_NATIVE_ENABLED=true`; acesse
`postgres.client` em código manual.

`AppMongoDatabaseConfig` disponibiliza `mongodb.client` e `mongodb.database`. Ele só
é conectado quando `MONGODB_ENABLED=true`. Customize pool, autenticação ou seleção
de banco sobrescrevendo os métodos protegidos da classe base.

## RabbitMQ

O contrato inicial gera o publisher `EntityChangedPub`. Para habilitar a conexão no
bootstrap, configure `RABBITMQ_ENABLED=true`. Publishers e subscribers adicionais
são declarados em `.gonthera/messaging.json`; implementações concretas de subscribers
devem permanecer em `src/messaging`, fora da pasta gerada.

## Fluxo de desenvolvimento

Edite os JSONs de `.gonthera` e execute:

```bash
npm run gonthera-validate
npm run gonthera-cli
npm run prisma:migrate -- --name descricao_da_alteracao
npm run typecheck
```

O Gonthera recria `src/generated` e `prisma/schema.prisma`. Mantenha controllers
customizados, regras de negócio, configuração concreta e rotas próprias fora desses
caminhos. As migrations em `prisma/migrations` devem ser versionadas.

Quando usar `controllerAbstract: true`, crie a subclasse concreta fora de
`src/generated`, registre sua factory em um arquivo da aplicação e passe o registro
como segundo argumento de `createGeneratedRoutes`. As rotas CRUD continuam geradas.

## Estrutura

```text
base-node-backend/
├── .gonthera/
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
