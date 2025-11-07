// init_db.js
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);

const db = new sqlite3.Database('./data/db.sqlite');

db.serialize(async () => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password_hash TEXT,
    role TEXT,
    full_name TEXT,
    driver_id INTEGER
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT, summary TEXT, content TEXT, date TEXT, image TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, phone TEXT, license TEXT, vehicle_id INTEGER, experience INTEGER, completed_orders_count INTEGER DEFAULT 0
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model TEXT, reg_number TEXT, last_service_date TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    direction TEXT, date_departure TEXT, approx_date TEXT, driver_id INTEGER, vehicle_id INTEGER,
    sum REAL, urgent INTEGER DEFAULT 0, premium REAL DEFAULT 0
  )`);

  // Check if users exist
  db.get("SELECT COUNT(*) AS c FROM users", async (err,row) => {
    if(err) { console.error(err); return; }
    if(row.c === 0){
      const pw1 = await bcrypt.hash('driver123', 10);
      const pw2 = await bcrypt.hash('manager123', 10);
      // create a driver and two users (driver + manager)
      db.run(`INSERT INTO drivers (name, phone, license, experience, completed_orders_count) VALUES (?, ?, ?, ?, ?)`,
        ['Павлов Алексей', '+7 900 000 00 01', 'A12345', 5, 120]);
      db.run(`INSERT INTO users (username, password_hash, role, full_name, driver_id) VALUES (?, ?, ?, ?, ?)`,
        ['driver1', pw1, 'driver', 'Павлов Алексей', 1]);
      db.run(`INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)`,
        ['manager1', pw2, 'manager', 'Сидорова Марина']);

      db.run(`INSERT INTO vehicles (model, reg_number, last_service_date) VALUES (?,?,?)`,
        ['ISUZU NPR75L-M', 'C726PB', '2025-09-25']);
      db.run(`INSERT INTO vehicles (model, reg_number, last_service_date) VALUES (?,?,?)`,
        ['KAMAZ 54901-70014-CA', 'O989NF', '2025-09-26']);
      db.run(`INSERT INTO vehicles (model, reg_number, last_service_date) VALUES (?,?,?)`,
        ['Mercedes-Benz Actros', 'A123VI', '2025-09-27']);

      db.run(`INSERT INTO orders (direction, date_departure, approx_date, driver_id, vehicle_id, sum, urgent, premium) VALUES (?,?,?,?,?,?,?,?)`,
        ['Москва-Таганрог','2025-09-12','2025-09-15',1,1,45768,1,4576.8]);
      db.run(`INSERT INTO news (title, summary, content, date, image) VALUES (?,?,?,?,?)`,
        ['Ростов-на-Дону: сокращённый режим работы 30 сентября', 'Короткое описание новости о режиме работы.', 'Полный текст новости: на 30 сентября отделение будет работать по сокращённому графику.', '2025-09-29', 'images/news1.jpg']);
    } else {
      console.log('DB already has users, skipping sample insert.');
    }
  });

  console.log('DB init done');
  db.close();
});