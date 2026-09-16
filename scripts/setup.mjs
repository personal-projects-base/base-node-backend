#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const options = parseArgs({
  options: {
    name: { type: 'string' },
    'display-name': { type: 'string' },
    'main-package': { type: 'string' },
    database: { type: 'string' },
    port: { type: 'string' },
    exchange: { type: 'string' },
    'overwrite-env': { type: 'boolean', default: false }
  }
}).values;

const packagePath = resolve(root, 'package.json');
const lockPath = resolve(root, 'package-lock.json');
const projectPath = resolve(root, '.gonthera/project.json');
const environmentExamplePath = resolve(root, '.env.example');
const environmentPath = resolve(root, '.env');
const documentationPath = resolve(root, 'docs/README.md');

const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
const projectJson = JSON.parse(await readFile(projectPath, 'utf8'));

const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
const terminal = interactive ? createInterface({ input: process.stdin, output: process.stdout }) : undefined;

function validateProjectName(value) {
  return /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value)
    ? undefined
    : 'Use letras minúsculas, números e hífens, começando por uma letra.';
}

function validateMainPackage(value) {
  return /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/.test(value)
    ? undefined
    : 'Use um package como com.empresa.projeto, somente com letras minúsculas e números.';
}

function validateDatabaseName(value) {
  return /^[a-z][a-z0-9_]*$/.test(value)
    ? undefined
    : 'Use letras minúsculas, números e underscore, começando por uma letra.';
}

function validatePort(value) {
  const port = Number(value);
  return Number.isInteger(port) && port >= 1 && port <= 65_535
    ? undefined
    : 'Informe uma porta inteira entre 1 e 65535.';
}

function validateExchange(value) {
  return /^[A-Za-z0-9._-]+$/.test(value)
    ? undefined
    : 'Use somente letras, números, ponto, hífen e underscore.';
}

async function resolveValue(optionValue, label, defaultValue, validator = () => undefined) {
  if (optionValue !== undefined) {
    const error = validator(optionValue);
    if (error) throw new Error(`${label}: ${error}`);
    return optionValue;
  }
  if (!terminal) return defaultValue;

  while (true) {
    const answer = (await terminal.question(`${label} [${defaultValue}]: `)).trim() || defaultValue;
    const error = validator(answer);
    if (!error) return answer;
    console.error(error);
  }
}

function displayNameFromProjectName(projectName) {
  return projectName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function replaceEnvironmentValue(contents, key, value) {
  const line = `${key}=${value}`;
  const expression = new RegExp(`^${key}=.*$`, 'm');
  return expression.test(contents) ? contents.replace(expression, line) : `${contents.trimEnd()}\n${line}\n`;
}

const projectName = await resolveValue(
  options.name,
  'Nome técnico do projeto',
  packageJson.name,
  validateProjectName
);
const displayName = await resolveValue(
  options['display-name'],
  'Nome de exibição',
  displayNameFromProjectName(projectName),
  value => value.trim() ? undefined : 'O nome de exibição não pode ser vazio.'
);
const compactName = projectName.replaceAll('-', '');
const mainPackage = await resolveValue(
  options['main-package'],
  'Main package Gonthera',
  `com.example.${compactName}`,
  validateMainPackage
);
const databaseName = await resolveValue(
  options.database,
  'Nome do banco MongoDB',
  projectName.replaceAll('-', '_'),
  validateDatabaseName
);
const port = await resolveValue(options.port, 'Porta HTTP', '3000', validatePort);
const exchange = await resolveValue(
  options.exchange,
  'Exchange RabbitMQ',
  `${projectName.replaceAll('-', '.')}.events`,
  validateExchange
);

terminal?.close();

packageJson.name = projectName;
packageJson.description = `${displayName} com Gonthera CLI, Express e Prisma.`;
await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

if (existsSync(lockPath)) {
  const packageLock = JSON.parse(await readFile(lockPath, 'utf8'));
  packageLock.name = projectName;
  if (packageLock.packages?.['']) packageLock.packages[''].name = projectName;
  await writeFile(lockPath, `${JSON.stringify(packageLock, null, 2)}\n`);
}

projectJson.projectName = projectName;
projectJson.mainPackage = mainPackage;
await writeFile(projectPath, `${JSON.stringify(projectJson, null, 2)}\n`);

let environmentExample = await readFile(environmentExamplePath, 'utf8');
environmentExample = replaceEnvironmentValue(environmentExample, 'APP_NAME', projectName);
environmentExample = replaceEnvironmentValue(environmentExample, 'APP_DISPLAY_NAME', JSON.stringify(displayName));
environmentExample = replaceEnvironmentValue(environmentExample, 'PORT', port);
environmentExample = replaceEnvironmentValue(
  environmentExample,
  'DATABASE_URL',
  `"mongodb://localhost:27017/${databaseName}?replicaSet=rs0&directConnection=true"`
);
environmentExample = replaceEnvironmentValue(
  environmentExample,
  'POSTGRES_URL',
  `"postgresql://${databaseName}:troque_esta_senha@localhost:5432/${databaseName}?schema=public"`
);
environmentExample = replaceEnvironmentValue(
  environmentExample,
  'MONGODB_URL',
  `"mongodb://localhost:27017/${databaseName}?replicaSet=rs0&directConnection=true"`
);
environmentExample = replaceEnvironmentValue(environmentExample, 'MONGODB_DATABASE', databaseName);
environmentExample = replaceEnvironmentValue(environmentExample, 'RABBITMQ_EXCHANGE', exchange);
await writeFile(environmentExamplePath, environmentExample);

if (!existsSync(environmentPath) || options['overwrite-env']) {
  await writeFile(environmentPath, environmentExample);
} else {
  console.warn('.env existente preservado. Use --overwrite-env para substituí-lo.');
}

let documentation = await readFile(documentationPath, 'utf8');
documentation = documentation.replace(/^# .+$/m, `# ${displayName}`);
await writeFile(documentationPath, documentation);

console.info(`Projeto configurado como ${projectName}.`);
console.info('Próximos passos:');
console.info('  npm run gonthera-validate');
console.info('  npm run gonthera-cli');
console.info('  npm run prisma:generate');
console.info('  docker compose up -d mongodb');
console.info('  npm run prisma:push');
console.info('  npm run dev');
