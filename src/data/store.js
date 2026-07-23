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

function getLevel(userId) {
  const levels = load('levels');
  if (!levels[userId]) {
    levels[userId] = { xp: 0, level: 1, lastMessage: 0 };
    save('levels', levels);
  }
  return levels[userId];
}

function setLevel(userId, data) {
  const levels = load('levels');
  levels[userId] = data;
  save('levels', levels);
}

function getAllLevels() {
  return load('levels');
}

// --- Moderation helpers ---

function addWarning(userId, warning) {
  const warnings = load('warnings');
  if (!warnings[userId]) warnings[userId] = [];
  warnings[userId].push(warning);
  save('warnings', warnings);
  return warnings[userId];
}

function getWarnings(userId) {
  const warnings = load('warnings');
  return warnings[userId] || [];
}

function clearWarnings(userId) {
  const warnings = load('warnings');
  warnings[userId] = [];
  save('warnings', warnings);
}

function removeWarning(userId, index) {
  const warnings = load('warnings');
  if (!warnings[userId]) return [];
  if (index === undefined || index === null) {
    warnings[userId] = [];
  } else {
    warnings[userId].splice(index, 1);
  }
  save('warnings', warnings);
  return warnings[userId] || [];
}

// --- Strike helpers (separate, more serious escalation track from warnings) ---

function addStrike(userId, strike) {
  const strikes = load('strikes');
  if (!strikes[userId]) strikes[userId] = [];
  strikes[userId].push(strike);
  save('strikes', strikes);
  return strikes[userId];
}

function getStrikes(userId) {
  const strikes = load('strikes');
  return strikes[userId] || [];
}

function removeStrike(userId, index) {
  const strikes = load('strikes');
  if (!strikes[userId]) return [];
  if (index === undefined || index === null) {
    strikes[userId] = [];
  } else {
    strikes[userId].splice(index, 1);
  }
  save('strikes', strikes);
  return strikes[userId] || [];
}

// --- Guild settings helpers (mute role, welcome/goodbye, automod, hierarchy, reaction roles) ---

const DEFAULT_SETTINGS = {
  mutedRoleId: null,
  welcomeChannelId: null,
  welcomeMessage: 'Welcome {user} to {server}! 🎉',
  goodbyeChannelId: null,
  goodbyeMessage: '{user} has left {server}. 👋',
  modLogChannelId: null,
  automod: { enabled: false, bannedWords: [] },
  hierarchy: [],
  reactionRoles: {},
  rules: '',
  faq: [],
  socials: [],
  affiliates: [],
  suggestionsChannelId: null,
  verifyRoleId: null,
  security: {
    inviteGuard: false,
    webhookGuard: false,
    joinGuard: false,
    minAccountAgeDays: 7,
  },
  leveling: {
    enabled: false,
    announceChannelId: null,
    levelRoles: {},
  },
  ticketPanels: {},
  serverInfoChannels: null,
};

function getSettings(guildId) {
  const all = load('settings');
  if (!all[guildId]) {
    all[guildId] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    save('settings', all);
  }
  all[guildId] = { ...JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), ...all[guildId] };
  return all[guildId];
}

function setSettings(guildId, data) {
  const all = load('settings');
  all[guildId] = data;
  save('settings', all);
}

// --- Moderation log helpers ---

function addModLog(guildId, entry) {
  const logs = load('modlogs');
  if (!logs[guildId]) logs[guildId] = [];
  const record = { id: logs[guildId].length + 1, timestamp: Date.now(), ...entry };
  logs[guildId].push(record);
  save('modlogs', logs);
  return record;
}

function getModLogs(guildId, { userId, limit = 10 } = {}) {
  const logs = load('modlogs');
  let entries = logs[guildId] || [];
  if (userId) entries = entries.filter(e => e.userId === userId);
  return entries.slice(-limit).reverse();
}

// --- Server backup helpers ---

function saveBackup(guildId, backup) {
  const backups = load('backups');
  backups[guildId] = { ...backup, createdAt: Date.now() };
  save('backups', backups);
}

function getBackup(guildId) {
  const backups = load('backups');
  return backups[guildId] || null;
}

// --- Birthday helpers ---

function setBirthday(userId, monthDay) {
  const birthdays = load('birthdays');
  birthdays[userId] = monthDay;
  save('birthdays', birthdays);
}

function getBirthday(userId) {
  const birthdays = load('birthdays');
  return birthdays[userId] || null;
}

function getAllBirthdays() {
  return load('birthdays');
}

// --- Reminder helpers ---

function addReminder(reminder) {
  const reminders = load('reminders');
  const nextId = (reminders.__nextId || 1);
  reminders.__nextId = nextId + 1;
  reminders[nextId] = { id: nextId, ...reminder };
  save('reminders', reminders);
  return reminders[nextId];
}

function getRemindersForUser(userId) {
  const reminders = load('reminders');
  return Object.values(reminders).filter(r => r && typeof r === 'object' && r.userId === userId);
}

function getAllReminders() {
  const reminders = load('reminders');
  return Object.values(reminders).filter(r => r && typeof r === 'object' && r.id);
}

function removeReminder(id) {
  const reminders = load('reminders');
  delete reminders[id];
  save('reminders', reminders);
}

// --- Partner points (separate currency for rewarding partners) ---

function getPartnerPoints(userId) {
  const points = load('partnerpoints');
  return points[userId] || 0;
}

function setPartnerPoints(userId, amount) {
  const points = load('partnerpoints');
  points[userId] = amount;
  save('partnerpoints', points);
}

function getAllPartnerPoints() {
  return load('partnerpoints');
}

// --- Mod stats (tracks closes and renames/claims separately, for the mod leaderboard) ---
// Each is worth 2 points; total points = (closes + renames) * 2

function addModAction(userId, type) {
  const stats = load('modstats');
  if (!stats[userId]) stats[userId] = { closes: 0, renames: 0 };
  if (type === 'close') stats[userId].closes += 1;
  if (type === 'rename') stats[userId].renames += 1;
  save('modstats', stats);
  return stats[userId];
}

function getAllModStats() {
  return load('modstats');
}

// --- Vouch helpers ---

function addVouch(userId, vouch) {
  const vouches = load('vouches');
  if (!vouches[userId]) vouches[userId] = [];
  vouches[userId].push(vouch);
  save('vouches', vouches);
  return vouches[userId];
}

function getVouches(userId) {
  const vouches = load('vouches');
  return vouches[userId] || [];
}

function getAllVouches() {
  return load('vouches');
}

function addDeniedVouch(userId, entry) {
  const denied = load('deniedvouches');
  if (!denied[userId]) denied[userId] = [];
  denied[userId].push(entry);
  save('deniedvouches', denied);
  return denied[userId];
}

function getAllDeniedVouches() {
  return load('deniedvouches');
}

module.exports = {
  load,
  save,
  getEconomy,
  setEconomy,
  getAllEconomy,
  getLevel,
  setLevel,
  getAllLevels,
  addWarning,
  getWarnings,
  clearWarnings,
  removeWarning,
  addStrike,
  getStrikes,
  removeStrike,
  getSettings,
  setSettings,
  addModLog,
  getModLogs,
  saveBackup,
  getBackup,
  setBirthday,
  getBirthday,
  getAllBirthdays,
  addReminder,
  getRemindersForUser,
  getAllReminders,
  removeReminder,
  getPartnerPoints,
  setPartnerPoints,
  getAllPartnerPoints,
  addModAction,
  getAllModStats,
  addVouch,
  getVouches,
  getAllVouches,
  addDeniedVouch,
  getAllDeniedVouches,
};
