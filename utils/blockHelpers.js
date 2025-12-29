const BlockedUser = require("../models/BlockedUser");
const { PermissionFlagsBits } = require("discord.js");

const SAFE_COMMANDS = [
  "blockcommand",
  "unblockcommand",
  "listblocked",
];

function isAdmin(member) {
  if (!member) return false;
  return member.permissions?.has(PermissionFlagsBits.Administrator);
}

async function isBlocked(arg1, arg2, arg3) {
  let guildId, userId, command, member;

  // 🔹 Slash / interaction style
  if (typeof arg1 === "object") {
    ({ guildId, userId, command, member } = arg1);
  }
  // 🔹 Prefix / noprefix style
  else {
    guildId = arg1;
    userId = arg2;
    command = arg3;
  }

  if (!guildId || !userId || !command) return false;

  // 🟢 SAFE COMMANDS BYPASS
  if (SAFE_COMMANDS.includes(command)) return false;

  // ✅ ADMIN / OWNER BYPASS
  if (isAdmin(member)) return false;

  // 🔍 Global block
  const globalBlock = await BlockedUser.findOne({
    guildId,
    userId,
    command: "*",
  });
  if (globalBlock) return true;

  // 🔍 Command-specific block
  const commandBlock = await BlockedUser.findOne({
    guildId,
    userId,
    command,
  });

  return !!commandBlock;
}

async function blockUser({
  guildId,
  userId,
  command = "*",
  blockedBy,
  reason,
}) {
  return BlockedUser.create({
    guildId,
    userId,
    command,
    blockedBy,
    reason,
  });
}

async function unblockUser({ guildId, userId, command = "*" }) {
  return BlockedUser.deleteMany({
    guildId,
    userId,
    command,
  });
}

module.exports = {
  isBlocked,
  blockUser,
  unblockUser,
};
