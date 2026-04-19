import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

let pool;

const baseConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};

export const initializePool = async () => {
  if (pool) {
    return pool;
  }

  if (!process.env.DB_NAME) {
    throw new Error("DB_NAME is not configured");
  }

  const bootstrapConnection = await mysql.createConnection(baseConfig);
  await bootstrapConnection.query(
    `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``
  );
  await bootstrapConnection.end();

  pool = mysql.createPool({
    ...baseConfig,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  return pool;
};

export const getDbPool = () => {
  if (!pool) {
    throw new Error("Database pool has not been initialized");
  }

  return pool;
};

export default getDbPool;
