// init_db.js
const sqlite3 = require('sqlite3').verbose();
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// создаём папку для базы, если её нет
import fs from 'fs';
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// создаём/открываем файл базы в data/
const dbPath = path.join(dataDir, 'database.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS trucks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model TEXT,
    plate_number TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    driver_id INTEGER,
    truck_id INTEGER,
    description TEXT,
    FOREIGN KEY(driver_id) REFERENCES drivers(id),
    FOREIGN KEY(truck_id) REFERENCES trucks(id)
  )`);
});

// ✅ Делаем закрытие базы только после полной инициализации
db.close(err => {
  if (err) {
    console.error('Ошибка при закрытии БД:', err.message);
  } else {
    console.log('База данных успешно инициализирована.');
  }
});
