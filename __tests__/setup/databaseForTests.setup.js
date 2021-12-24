require("dotenv").load();
const Sequelize = require("sequelize");

let db;

function loadDb() {
  const dbUrl = process.env.DATABASE_URL_LOCAL;
  const sequelizeSettings = {
    host: "localhost",
    dialect: "postgres",
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
