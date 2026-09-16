# Configuração de banco de dados

Esta base usa **MongoDB por padrão**. O CRUD gerado pelo Gonthera acessa o banco
por meio do Prisma e lê a conexão de `DATABASE_URL`.

O Gonthera CLI 2.1.4 para Node.js oferece suporte oficial a dois providers:

- `MONGODB`;
- `POSTGRESQL`.

MySQL, MariaDB, SQL Server, SQLite e outros bancos relacionais não devem ser
tratados apenas como uma troca de URL. Embora o Prisma suporte outros providers,
o gerador Gonthera possui regras próprias de schema, tipos, chaves, relações,
transações e migrations. Nesta versão, use PostgreSQL quando precisar de banco
relacional.

## MongoDB — configuração padrão

### 1. Configure o projeto Gonthera

O arquivo `.gonthera/project.json` deve conter:

```json
{
  "mainPackage": "com.gonthera.basenode",
  "projectName": "base-node-backend",
  "language": "NODE",
  "database": {
    "provider": "MONGODB"
  }
}
```

### 2. Configure o ambiente

Copie o exemplo e mantenha a URL MongoDB:

```bash
cp .env.example .env
```

```dotenv
DATABASE_URL="mongodb://localhost:27017/base_node?replicaSet=rs0&directConnection=true"
PRISMA_DEPLOY_MODE=push
```

Os repositories gerados usam transações. Por isso, o MongoDB precisa ser um
replica set; uma instância standalone falha com o erro Prisma `P2031`.

### 3. Inicie o MongoDB local

O Compose inicia uma instância de desenvolvimento e configura o replica set `rs0`:

```bash
docker compose up -d mongodb
docker compose ps
```

Essa instância não configura autenticação e publica a porta somente no loopback
da máquina. Em ambientes compartilhados ou de produção, habilite autenticação,
TLS, gerenciamento de segredos, backups e um replica set com redundância real.

### 4. Gere e aplique o schema

```bash
npm run gonthera-validate
npm run gonthera-cli
npm run prisma:validate
npm run prisma:generate
npm run prisma:push
```

O MongoDB não usa Prisma Migrate. Não execute `prisma:migrate` ou
`prisma:deploy` com esse provider.

### 5. Inicie a API

```bash
npm run dev
```

Para executar API e banco em containers, gere os fontes primeiro e use:

```bash
npm run gonthera-cli
docker compose up --build
```

## PostgreSQL — provider relacional suportado

### 1. Troque o provider do Gonthera

Em `.gonthera/project.json`, altere somente o provider:

```json
"database": {
  "provider": "POSTGRESQL"
}
```

Se o objeto `database` for omitido, o Gonthera também assume PostgreSQL por
retrocompatibilidade. Recomenda-se mantê-lo explícito.

### 2. Configure a conexão

No `.env`, use uma URL PostgreSQL e o modo de migrations:

```dotenv
DATABASE_URL="postgresql://base_node:troque_esta_senha@localhost:5432/base_node?schema=public"
PRISMA_DEPLOY_MODE=migrate
```

### 3. Disponibilize o PostgreSQL

Crie o banco e o usuário informados em `DATABASE_URL`, seja por uma instalação
local, um container ou um serviço gerenciado. Confirme que a porta e o host são
acessíveis pela API.

Exemplo de serviço para um arquivo Compose da aplicação:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: base_node
      POSTGRES_USER: base_node
      POSTGRES_PASSWORD: troque_esta_senha
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Não reutilize essa senha de exemplo em ambientes compartilhados ou de produção.

### 4. Regenere os fontes e o schema Prisma

A saída de `src/generated` e `prisma/schema.prisma` depende do provider. Sempre
regenere após a troca:

```bash
npm run gonthera-validate
npm run gonthera-cli
npm run prisma:validate
npm run prisma:generate
```

### 5. Crie e aplique migrations

No desenvolvimento, crie uma migration versionada:

```bash
npm run prisma:migrate -- --name descricao_da_alteracao
```

Em homologação e produção, aplique apenas migrations já versionadas:

```bash
npm run prisma:deploy
```

### 6. Inicie a API

```bash
npm run dev
```

## Ao trocar de provider

A troca do provider não migra os dados existentes. Antes de mudar:

1. faça backup do banco de origem;
2. altere `.gonthera/project.json` e `DATABASE_URL`;
3. regenere `src/generated` e `prisma/schema.prisma`;
4. use `prisma db push` para MongoDB ou Prisma Migrate para PostgreSQL;
5. planeje uma migração de dados separada;
6. valide relações, filtros e transações da aplicação.

As migrations existentes em `prisma/migrations` pertencem ao PostgreSQL e não são
executadas no fluxo MongoDB.

## Clientes nativos opcionais

O CRUD padrão não depende de `MONGODB_ENABLED` nem de
`POSTGRES_NATIVE_ENABLED`: ele usa o Prisma.

- `MONGODB_ENABLED=true` conecta também o cliente nativo definido em
  `src/configuration/database/mongodb.config.ts`;
- `POSTGRES_NATIVE_ENABLED=true` conecta também o pool `pg` definido em
  `src/configuration/database/postgres.config.ts`.

Ative esses clientes somente para repositories ou módulos customizados que
realmente precisem deles. O pool nativo usa `POSTGRES_URL`; se ela estiver ausente,
aceita `DATABASE_URL` somente quando essa URL apontar para PostgreSQL. Essa separação
permite manter MongoDB no Prisma e acessar PostgreSQL em um módulo customizado sem
misturar as duas conexões.
