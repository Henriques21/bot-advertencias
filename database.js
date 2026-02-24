const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

if (!fs.existsSync("./database")) {
  fs.mkdirSync("./database");
}

const db = new sqlite3.Database("./database/advertencias.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS advertencias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario TEXT,
      tipo TEXT,
      motivo TEXT,
      valor TEXT,
      staff TEXT,
      dataAplicacao TEXT,
      dataExpiracao TEXT,
      ativa INTEGER
    )
  `);
});

module.exports = db;