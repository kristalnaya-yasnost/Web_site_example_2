// server.js
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const app = express();

// --- создаём папку data, если её нет
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
  console.log('📂 Папка data создана');
}

// --- подключаем базу
const dbPath = path.join(dataDir, 'database.db');
const db = new sqlite3.Database(dbPath);

// --- middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'secret-for-dev',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 }
}));

app.use(express.static(path.join(__dirname, 'public')));

// ================= AUTH =================
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ?", [username], async (err, row) => {
    if (err) return res.status(500).json({ error: 'db' });
    if (!row) return res.status(401).json({ error: 'invalid' });

    const ok = await bcrypt.compare(password, row.password);
    if (!ok) return res.status(401).json({ error: 'invalid' });

    req.session.user = { id: row.id, role: row.role, username: row.username };
    res.json({ id: row.id, role: row.role, username: row.username });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.json({ logged: false });
  res.json({ logged: true, user: req.session.user });
});

// ================= NEWS =================
function requireManager(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'manager') {
    return res.status(403).json({ error: 'forbidden' });
  }
  next();
}

app.get('/api/news', (req, res) => {
  db.all("SELECT * FROM news ORDER BY created_at DESC", [], (err, rows) => {
    if (err) res.status(500).json({ error: err });
    else res.json(rows);
  });
});

app.get('/api/news/:id', (req, res) => {
  db.get("SELECT * FROM news WHERE id = ?", [req.params.id], (err, row) => {
    if (err) res.status(500).json({ error: err });
    else res.json(row);
  });
});

app.post('/api/news', requireManager, (req, res) => {
  const { title, content } = req.body;
  db.run("INSERT INTO news (title, content) VALUES (?, ?)", [title, content], function (err) {
    if (err) res.status(500).json({ error: err });
    else res.json({ id: this.lastID });
  });
});

app.put('/api/news/:id', requireManager, (req, res) => {
  const { title, content } = req.body;
  db.run("UPDATE news SET title=?, content=? WHERE id=?", [title, content, req.params.id], function (err) {
    if (err) res.status(500).json({ error: err });
    else res.json({ ok: true });
  });
});

app.delete('/api/news/:id', requireManager, (req, res) => {
  db.run("DELETE FROM news WHERE id=?", [req.params.id], function (err) {
    if (err) res.status(500).json({ error: err });
    else res.json({ ok: true });
  });
});

// ================= DRIVERS / TRUCKS / ORDERS =================
app.get('/api/drivers', (req, res) => {
  db.all("SELECT * FROM drivers", [], (e, r) => res.json(r));
});

app.post('/api/drivers', requireManager, (req, res) => {
  const { name, phone } = req.body;
  db.run("INSERT INTO drivers (name, phone) VALUES (?, ?)", [name, phone], function (err) {
    if (err) res.status(500).json({ error: err });
    else res.json({ id: this.lastID });
  });
});

app.get('/api/trucks', (req, res) => {
  db.all("SELECT * FROM trucks", [], (e, r) => res.json(r));
});

app.post('/api/trucks', requireManager, (req, res) => {
  const { model, plate_number } = req.body;
  db.run("INSERT INTO trucks (model, plate_number) VALUES (?, ?)", [model, plate_number], function (err) {
    if (err) res.status(500).json({ error: err });
    else res.json({ id: this.lastID });
  });
});

app.get('/api/orders', (req, res) => {
  db.all(
    `SELECT o.*, d.name AS driver_name, t.model AS truck_model
     FROM orders o
     LEFT JOIN drivers d ON d.id=o.driver_id
     LEFT JOIN trucks t ON t.id=o.truck_id`,
    [],
    (e, r) => res.json(r)
  );
});

app.post('/api/orders', requireManager, (req, res) => {
  const { driver_id, truck_id, description } = req.body;
  db.run("INSERT INTO orders (driver_id, truck_id, description) VALUES (?, ?, ?)",
    [driver_id, truck_id, description],
    function (err) {
      if (err) res.status(500).json({ error: err });
      else res.json({ id: this.lastID });
    });
});

// ================= SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
