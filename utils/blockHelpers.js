const BlockedUser = require("../models/BlockedUser");
const { PermissionFlagsBits } = require("discord.js");

const SAFE_COMMANDS = [
  "blockcommand",
  "unblockcommand",
  "listblocked",
];

async function isAdmin(member) {
  if (!member) return false;

  return member.permissions.has(
    PermissionFlagsBits.Administrator
  );
}

async function isBlocked({ guildId, userId, command, member }) {
  
    // 🟢 SAFE COMMANDS BYPASS
  if (SAFE_COMMANDS.includes(command)) return false;
    // ✅ ADMIN BYPASS
  if (await isAdmin(member)) return false;

  // 🔍 Check global block
  const globalBlock = await BlockedUser.findOne({
    guildId,
    userId,
    command: "*",
  });

  if (globalBlock) return true;

  // 🔍 Check command-specific block
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
