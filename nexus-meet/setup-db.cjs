const { Client } = require('pg');

async function main() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'postgres',
    port: 5433
  });

  await client.connect();

  try {
    await client.query("CREATE ROLE nexusmeet WITH LOGIN PASSWORD 'nexusmeet_dev' SUPERUSER");
    console.log("User nexusmeet created successfully");
  } catch (e) {
    if (e.code === '42710') {
      console.log("User nexusmeet already exists");
    } else {
      console.error("Error creating user:", e);
    }
  }

  try {
    await client.query("CREATE DATABASE nexusmeet_db OWNER nexusmeet");
    console.log("Database nexusmeet_db created successfully");
  } catch (e) {
    if (e.code === '42P04') {
      console.log("Database nexusmeet_db already exists");
    } else {
      console.error("Error creating database:", e);
    }
  }

  await client.end();
}

main().catch(console.error);
