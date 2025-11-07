// server.js
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
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

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'secret-for-dev', resave: false, saveUninitialized: true, cookie: { maxAge: 3600000 }
}));

app.use(express.static(path.join(__dirname, 'public')));

// ---- AUTH
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ?", [username], async (err, row) => {
    if (err) return res.status(500).json({ error: 'db' });
    if (!row) return res.status(401).json({ error: 'invalid' });
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid' });
    req.session.user = { id: row.id, role: row.role, full_name: row.full_name, driver_id: row.driver_id };
    res.json({ id: row.id, role: row.role, full_name: row.full_name });
  });
});
app.post('/api/logout', (req,res)=> { req.session.destroy(()=>res.json({ok:true})); });
app.get('/api/me', (req,res) => {
  if (!req.session.user) return res.json({ logged: false });
  res.json({ logged: true, user: req.session.user });
});

// ---- NEWS (public GET, manager POST/PUT/DELETE)
app.get('/api/news', (req,res) => {
  db.all("SELECT * FROM news ORDER BY date DESC", [], (err, rows) => res.json(rows));
});
app.get('/api/news/:id', (req,res) => {
  db.get("SELECT * FROM news WHERE id=?", [req.params.id], (err, row) => res.json(row));
});
function requireManager(req,res,next){
  if(!req.session.user || req.session.user.role !== 'manager') return res.status(403).json({error:'forbidden'});
  next();
}
app.post('/api/news', requireManager, (req,res) => {
  const { title, summary, content, date, image } = req.body;
  db.run("INSERT INTO news (title,summary,content,date,image) VALUES (?,?,?,?,?)",
    [title,summary,content,date,image], function(err){ if(err) res.status(500).json({error:err}); else res.json({id:this.lastID});});
});
app.put('/api/news/:id', requireManager, (req,res) => {
  const { title, summary, content, date, image } = req.body;
  db.run("UPDATE news SET title=?,summary=?,content=?,date=?,image=? WHERE id=?",
    [title,summary,content,date,image, req.params.id], function(err){ if(err) res.status(500).json({error:err}); else res.json({ok:true});});
});
app.delete('/api/news/:id', requireManager, (req,res) => {
  db.run("DELETE FROM news WHERE id=?", [req.params.id], function(err){ if(err) res.status(500).json({error:err}); else res.json({ok:true});});
});

// ---- DRIVERS / VEHICLES / ORDERS (simple APIs)
app.get('/api/drivers', (req,res) => db.all("SELECT * FROM drivers",[],(e,r)=>res.json(r)));
app.post('/api/drivers', requireManager, (req,res)=> {
  const { name, phone, license, experience } = req.body;
  db.run("INSERT INTO drivers (name,phone,license,experience) VALUES (?,?,?,?)", [name,phone,license,experience],
    function(err){ if(err) res.status(500).json({error:err}); else res.json({id:this.lastID});});
});
app.get('/api/vehicles', (req,res)=> db.all("SELECT * FROM vehicles",[],(e,r)=>res.json(r)));
app.post('/api/vehicles', requireManager, (req,res)=> {
  const { model, reg_number, last_service_date } = req.body;
  db.run("INSERT INTO vehicles (model,reg_number,last_service_date) VALUES (?,?,?)", [model,reg_number,last_service_date],
    function(err){ if(err) res.status(500).json({error:err}); else res.json({id:this.lastID});});
});
app.get('/api/orders', (req,res)=> db.all("SELECT o.*, d.name as driver_name, v.model as vehicle_model FROM orders o LEFT JOIN drivers d ON d.id=o.driver_id LEFT JOIN vehicles v ON v.id=o.vehicle_id",[],(e,r)=>res.json(r)));
app.post('/api/orders', requireManager, (req,res)=> {
  const { direction, date_departure, approx_date, driver_id, vehicle_id, sum, urgent, premium } = req.body;
  db.run("INSERT INTO orders (direction,date_departure,approx_date,driver_id,vehicle_id,sum,urgent,premium) VALUES (?,?,?,?,?,?,?,?)",
    [direction,date_departure,approx_date,driver_id,vehicle_id,sum,urgent?1:0,premium||0], function(err){ if(err) res.status(500).json({error:err}); else res.json({id:this.lastID});});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log('Server running on', PORT));
