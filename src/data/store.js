// Issa's Bot Store.js
// JSON File Database

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "storage");

if (!fs.existsSync(DATA_DIR)) {
fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getFile(name) {
return path.join(DATA_DIR, ${name}.json);
}

function load(name) {
const file = getFile(name);

if (!fs.existsSync(file)) return {};  

try {  
    return JSON.parse(fs.readFileSync(file, "utf8"));  
} catch {  
    return {};  
}

}

function save(name, data) {
fs.writeFileSync(
getFile(name),
JSON.stringify(data, null, 2)
);
}

// =======================
// ECONOMY
// =======================

function getEconomy(userId) {
const economy = load("economy");

if (!economy[userId]) {  
    economy[userId] = {  
        balance: 100,  
        bank: 0,  
        inventory: [],  
        lastDaily: 0,  
        lastWork: 0  
    };  

    save("economy", economy);  
}  

return economy[userId];

}

function setEconomy(userId, data) {
const economy = load("economy");
economy[userId] = data;
save("economy", economy);
}

function getAllEconomy() {
return load("economy");
}

// =======================
// LEVELING
// =======================

function getLevel(userId) {
const levels = load("levels");

if (!levels[userId]) {  
    levels[userId] = {  
        xp: 0,  
        level: 1  
    };  

    save("levels", levels);  
}  

return levels[userId];

}

function setLevel(userId, data) {
const levels = load("levels");
levels[userId] = data;
save("levels", levels);
}

function getAllLevels() {
return load("levels");
}

// =======================
// WARNINGS
// =======================

function addWarning(userId, warning) {
const warnings = load("warnings");

if (!warnings[userId]) warnings[userId] = [];  

warnings[userId].push(warning);  

save("warnings", warnings);  

return warnings[userId];

}

function getWarnings(userId) {
const warnings = load("warnings");
return warnings[userId] || [];
}

function clearWarnings(userId) {
const warnings = load("warnings");
warnings[userId] = [];
save("warnings", warnings);
}

// =======================
// STRIKES
// =======================

function addStrike(userId, strike) {
const strikes = load("strikes");

if (!strikes[userId]) strikes[userId] = [];  

strikes[userId].push(strike);  

save("strikes", strikes);  

return strikes[userId];

}

function getStrikes(userId) {
const strikes = load("strikes");
return strikes[userId] || [];
}

function removeStrike(userId, index) {
const strikes = load("strikes");

if (!strikes[userId]) return [];  

strikes[userId].splice(index, 1);  

save("strikes", strikes);  

return strikes[userId];

}

// =======================
// PARTNER POINTS
// =======================

function getPartnerPoints(userId) {
const points = load("partnerpoints");
return points[userId] || 0;
}

function addPartnerPoints(userId, amount) {
const points = load("partnerpoints");

points[userId] = (points[userId] || 0) + amount;  

save("partnerpoints", points);  

return points[userId];

}

function removePartnerPoints(userId, amount) {
const points = load("partnerpoints");

points[userId] = Math.max(  
    (points[userId] || 0) - amount,  
    0  
);  

save("partnerpoints", points);  

return points[userId];

}

function getAllPartnerPoints() {
return load("partnerpoints");
}

// =======================
// MOD LEADERBOARD
// =======================

function addModAction(userId, type) {
const stats = load("modstats");

if (!stats[userId]) {  
    stats[userId] = {  
        closes: 0,  
        renames: 0,  
        points: 0  
    };  
}  

if (type === "close") {  
    stats[userId].closes++;  
    stats[userId].points += 2;  
}  

if (type === "rename") {  
    stats[userId].renames++;  
    stats[userId].points += 2;  
}  

save("modstats", stats);  

return stats[userId];

}

function getModStats(userId) {
const stats = load("modstats");

return stats[userId] || {  
    closes: 0,  
    renames: 0,  
    points: 0  
};

}

function getAllModStats() {
return load("modstats");
}

// =======================
// SETTINGS
// =======================

const DEFAULT_SETTINGS = {
mutedRoleId: null,
welcomeChannelId: null,
welcomeMessage: "Welcome {user}!",
goodbyeChannelId: null,
modLogChannelId: null,

automod: {  
    enabled: false,  
    bannedWords: []  
},  

ticketPanels: {},  

leveling: {  
    enabled: false,  
    levelRoles: {}  
}

};

function getSettings(guildId) {
const settings = load("settings");

if (!settings[guildId]) {  
    settings[guildId] = DEFAULT_SETTINGS;  
    save("settings", settings);  
}  

return settings[guildId];

}

function setSettings(guildId, data) {
const settings = load("settings");

settings[guildId] = data;  

save("settings", settings);

}

// =======================
// MOD LOGS
// =======================

function addModLog(guildId, entry) {
const logs = load("modlogs");

if (!logs[guildId]) logs[guildId] = [];  

logs[guildId].push({  
    id: logs[guildId].length + 1,  
    time: Date.now(),  
    ...entry  
});  

save("modlogs", logs);

}

function getModLogs(guildId) {
const logs = load("modlogs");

return logs[guildId] || [];

}

// =======================
// VOUCHES
// =======================

function addVouch(userId, vouch) {
const vouches = load("vouches");

if (!vouches[userId]) vouches[userId] = [];  

vouches[userId].push(vouch);  

save("vouches", vouches);  

return vouches[userId];

}

function getVouches(userId) {
const vouches = load("vouches");

return vouches[userId] || [];

}

function getAllVouches() {
return load("vouches");
}

function addDeniedVouch(userId, data) {
const denied = load("deniedvouches");

if (!denied[userId]) denied[userId] = [];  

denied[userId].push(data);  

save("deniedvouches", denied);

}

function getAllDeniedVouches() {
return load("deniedvouches");
}

// =======================
// EXPORTS
// =======================

module.exports = {

load,  
save,  

// Economy  
getEconomy,  
setEconomy,  
getAllEconomy,  

// Levels  
getLevel,  
setLevel,  
getAllLevels,  

// Warnings  
addWarning,  
getWarnings,  
clearWarnings,  

// Strikes  
addStrike,  
getStrikes,  
removeStrike,  

// Partner Points  
getPartnerPoints,  
addPartnerPoints,  
removePartnerPoints,  
getAllPartnerPoints,  

// Mod LB  
addModAction,  
getModStats,  
getAllModStats,  

// Settings  
getSettings,  
setSettings,  

// Logs  
addModLog,  
getModLogs,  

// Vouches  
addVouch,  
getVouches,  
getAllVouches,  
addDeniedVouch,  
getAllDeniedVouches

};
