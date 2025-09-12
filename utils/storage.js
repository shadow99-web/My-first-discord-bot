const fs = require("fs");

// Default prefix
const defaultPrefix = "!";

// Safe JSON loader
function safeRead(file, fallback = {}) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf8") || "{}");
    } catch {
        return fallback;
    }
}

// Prefixes
const prefixFile = "./prefixes.json";
if (!fs.existsSync(prefixFile)) fs.writeFileSync(prefixFile, "{}");
const getPrefixes = () => safeRead(prefixFile, {});
const savePrefixes = (prefixes) => fs.writeFileSync(prefixFile, JSON.stringify(prefixes, null, 4));

// Blocked users
const blockFile = "./block.json";
if (!fs.existsSync(blockFile)) fs.writeFileSync(blockFile, "{}");
const getBlocked = () => safeRead(blockFile, {});
const saveBlocked = (data) => fs.writeFileSync(blockFile, JSON.stringify(data, null, 4));

// Autorole
const autoroleFile = "./autorole.json";
if (!fs.existsSync(autoroleFile)) fs.writeFileSync(autoroleFile, "{}");
const getAutorole = () => safeRead(autoroleFile, {});
const saveAutorole = (data) => fs.writeFileSync(autoroleFile, JSON.stringify(data, null, 4));

module.exports = { defaultPrefix, getPrefixes, savePrefixes, getBlocked, saveBlocked, getAutorole, saveAutorole };
