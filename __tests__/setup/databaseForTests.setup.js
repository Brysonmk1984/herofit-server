require("dotenv").load();
const Sequelize = require("sequelize");

let db;

function loadDb() {
  const dbUrl = process.env.DATABASE_URL_LOCAL;
  const sequelizeSettings = {
    host: "localhost",
    dialect: "postgres",
    dialectOptions: {
      ssl: true,
      //rejectUnauthorized: false, // Might be needed for This is due to an (accidental) breaking change in node-postgres version 8
    },
    protocol: "postgres",
    operatorsAliases: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    query: { raw: true },
  };
  db = new Sequelize(dbUrl, sequelizeSettings);
  db.authenticate();
}

function closeDb() {
  db.close();
}

module.exports = { loadDb, closeDb };
