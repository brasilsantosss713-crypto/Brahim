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
};

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
  const leveling = load('leveling');
  if (!leveling[userId]) {
    leveling[userId] = { xp: 0, level: 1, lastMessage: 0 };
    save('leveling', leveling);
  }
  return leveling[userId];
}

function setLevel(userId, data) {
  const leveling = load('leveling');
  leveling[userId] = data;
  save('leveling', leveling);
}

function getAllLevels() {
  return load('leveling');
}

// --- Server settings ---

function getSettings(guildId) {
  const settings = load('settings');
  if (!settings[guildId]) {
    settings[guildId] = { ...DEFAULT_SETTINGS };
    save('settings', settings);
  }
  return settings[guildId];
}

function setSettings(guildId, data) {
  const settings = load('settings');
  settings[guildId] = data;
  save('settings', settings);
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
  delete warnings[userId];
  save('warnings', warnings);
}

function addModLog(guildId, entry) {
  const logs = load('modlogs');
  if (!logs[guildId]) logs[guildId] = [];
  entry.id = logs[guildId].length + 1;
  entry.timestamp = Date.now();
  logs[guildId].push(entry);
  save('modlogs', logs);
}

function getModLogs(guildId, options = {}) {
  const logs = load('modlogs');
  let entries = logs[guildId] || [];
  
  if (options.userId) {
    entries = entries.filter(e => e.userId === options.userId);
  }
  
  if (options.limit) {
    entries = entries.slice(-options.limit);
  }
  
  return entries;
}

// --- Backup helpers ---

function saveBackup(guildId, backup) {
  const backups = load('backups');
  if (!backups[guildId]) backups[guildId] = [];
  backup.createdAt = Date.now();
  backups[guildId].push(backup);
  save('backups', backups);
}

function getBackup(guildId) {
  const backups = load('backups');
  const guildBackups = backups[guildId] || [];
  return guildBackups.length > 0 ? guildBackups[guildBackups.length - 1] : null;
}

// --- Reminder helpers ---

function addReminder(reminder) {
  const reminders = load('reminders');
  if (!reminders.list) reminders.list = [];
  if (!reminders.nextId) reminders.nextId = 1;
  
  reminder.id = reminders.nextId++;
  reminders.list.push(reminder);
  save('reminders', reminders);
  return reminder;
}

function getAllReminders() {
  const reminders = load('reminders');
  return reminders.list || [];
}

function getRemindersForUser(userId) {
  const reminders = load('reminders');
  return (reminders.list || []).filter(r => r.userId === userId || r.createdBy === userId);
}

function removeReminder(reminderId) {
  const reminders = load('reminders');
  reminders.list = (reminders.list || []).filter(r => r.id !== reminderId);
  save('reminders', reminders);
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
  getSettings,
  setSettings,
  addWarning,
  getWarnings,
  clearWarnings,
  addModLog,
  getModLogs,
  saveBackup,
  getBackup,
  addReminder,
  getAllReminders,
  getRemindersForUser,
  removeReminder,
};

