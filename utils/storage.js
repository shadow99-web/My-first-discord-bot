const fs = require("fs");

// Default prefix
const defaultPrefix = "!";

// Prefixes
const prefixFile = "./prefixes.json";
if (!fs.existsSync(prefixFile)) fs.writeFileSync(prefixFile, "{}");
const getPrefixes = () => JSON.parse(fs.readFileSync(prefixFile, "utf8"));
const savePrefixes = (prefixes) => fs.writeFileSync(prefixFile, JSON.stringify(prefixes, null, 4));

// Blocked users
const blockFile = "./block.json";
if (!fs.existsSync(blockFile)) fs.writeFileSync(blockFile, "{}");
const getBlocked = () => JSON.parse(fs.readFileSync(blockFile, "utf8"));
const saveBlocked = (data) => fs.writeFileSync(blockFile, JSON.stringify(data, null, 4));

// Autorole
const autoroleFile = "./autorole.json";
if (!fs.existsSync(autoroleFile)) fs.writeFileSync(autoroleFile, "{}");
const getAutorole = () => {
    try { return JSON.parse(fs.readFileSync(autoroleFile, "utf8") || "{}"); }
    catch { return {}; }
};
const saveAutorole = (data) => fs.writeFileSync(autoroleFile, JSON.stringify(data, null, 4));

module.exports = { defaultPrefix, getPrefixes, savePrefixes, getBlocked, saveBlocked, getAutorole, saveAutorole };
