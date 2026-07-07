// Simple JSON-file-backed data store.
// Good enough for small/medium servers. Swap this out for a real database
// (SQLite, MongoDB, PostgreSQL) if you need something production-grade.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'storage');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function filePathFor(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function load(name) {
  const file = filePathFor(name);
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`Failed to parse ${file}:`, err);
    return {};
  }
}

function save(name, data) {
  const file = filePathFor(name);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// --- Economy helpers ---

function getEconomy(userId) {
  const economy = load('economy');
  if (!economy[userId]) {
    economy[userId] = { balance: 100, bank: 0, lastDaily: 0, lastWork: 0, inventory: [] };
    save('economy', economy);
  }
  return economy[userId];
}

function setEconomy(userId, data) {
  const economy = load('economy');
  economy[userId] = data;
  save('economy', economy);
}

function getAllEconomy() {
  return load('economy');
}

// --- Leveling helpers ---

function
