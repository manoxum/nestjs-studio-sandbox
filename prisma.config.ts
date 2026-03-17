// filename: prisma.config.ts

import 'dotenv/config';
import { defineConfig, env } from "prisma/config";


// Acessa as variáveis do .env
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT;
const dbName = process.env.DB_NAME;

// Constrói a URL de conexão
const databaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=public`;

// Opcional: log para depuração (remova depois)
console.log('🔌 DATABASE_URL gerada:', databaseUrl);


export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});