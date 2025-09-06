require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(process.env.PORT || 3000);

// ---------------- BOT SETUP ----------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ---------------- COMMAND DEFINITIONS ----------------
const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
  new SlashCommandBuilder().setName('ban').setDescription('Ban a member')
    .addUserOption(o => o.setName('user').setDescription('User to ban').setRequired(true)),
  new SlashCommandBuilder().setName('kick').setDescription('Kick a member')
    .addUserOption(o => o.setName('user').setDescription('User to kick').setRequired(true)),
  new SlashCommandBuilder().setName('timeout').setDescription('Timeout a member')
    .addUserOption(o => o.setName('user').setDescription('User to timeout').setRequired(true))
    .addIntegerOption(o => o.setName('duration').setDescription('Seconds').setRequired(true)),
  new SlashCommandBuilder().setName('untimeout').setDescription('Remove timeout')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('purge').setDescription('Delete messages')
    .addIntegerOption(o => o.setName('amount').setDescription('Number of messages').setRequired(true)),
  new SlashCommandBuilder().setName('purgeuser').setDescription('Delete messages from a specific user')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Number of messages').setRequired(true)),
  new SlashCommandBuilder().setName('role').setDescription('Add role')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
  new SlashCommandBuilder().setName('unrole').setDescription('Remove role')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
  new SlashCommandBuilder().setName('roleall').setDescription('Give role to all members')
    .addRoleOption(o => o.setName('role').setDescription('Role to give').setRequired(true)),
  new SlashCommandBuilder().setName('unroleall').setDescription('Remove role from all members')
    .addRoleOption(o => o.setName('role').setDescription('Role to remove').setRequired(true)),
  new SlashCommandBuilder().setName('nuke').setDescription('Delete all messages in a channel'),
  new SlashCommandBuilder().setName('nick').setDescription('Change nickname')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addStringOption(o => o.setName('nickname').setDescription('New nickname').setRequired(true)),
  new SlashCommandBuilder().setName('serverinfo').setDescription('Server info'),
  new SlashCommandBuilder().setName('userinfo').setDescription('User info').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('steal').setDescription('Steal an emoji').addStringOption(o => o.setName('emoji').setDescription('Emoji to steal').setRequired(true)),
  new SlashCommandBuilder().setName('translate').setDescription('Translate text').addStringOption(o => o.setName('text').setDescription('Text to translate').setRequired(true)),
  new SlashCommandBuilder().setName('membercount').setDescription('Total members'),
  new SlashCommandBuilder().setName('boostcount').setDescription('Server boosts')
].map(c => c.toJSON());

// ---------------- REGISTER GLOBAL COMMANDS ----------------
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    console.log('Registering global commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Global commands registered!');
  } catch (err) {
    console.error(err);
  }
})();

// ---------------- BOT EVENTS ----------------
client.once('ready', () => console.log(`Logged in as ${client.user.tag}!`));

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  const { commandName, options, member, guild, channel } = interaction;

  try {
    if (commandName === 'ping') return interaction.reply('Pong!');

    if (commandName === 'ban') {
      if (!member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply('❌ No permission.');
      const user = options.getUser('user');
      const target = guild.members.cache.get(user.id);
      if (!target) return interaction.reply('User not found.');
      await target.ban({ reason: `Banned by ${member.user.tag}` });
      return interaction.reply(`✅ ${user.tag} banned.`);
    }

    if (commandName === 'kick') {
      if (!member.permissions.has(PermissionFlagsBits.KickMembers)) return interaction.reply('❌ No permission.');
      const user = options.getUser('user');
      const target = guild.members.cache.get(user.id);
      if (!target) return interaction.reply('User not found.');
      await target.kick(`Kicked by ${member.user.tag}`);
      return interaction.reply(`✅ ${user.tag} kicked.`);
    }

    if (commandName === 'timeout') {
      if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply('❌ No permission.');
      const user = options.getUser('user');
      const duration = options.getInteger('duration') * 1000;
      const target = guild.members.cache.get(user.id);
      if (!target) return interaction.reply('User not found.');
      await target.timeout(duration, `Timed out by ${member.user.tag}`);
      return interaction.reply(`✅ ${user.tag} timed out for ${options.getInteger('duration')}s.`);
    }

    if (commandName === 'untimeout') {
      if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply('❌ No permission.');
      const user = options.getUser('user');
      const target = guild.members.cache.get(user.id);
      if (!target) return interaction.reply('User not found.');
      await target.timeout(null);
      return interaction.reply(`✅ ${user.tag} un-timed out.`);
    }

    if (commandName === 'purge') {
      if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply('❌ No permission.');
      const amount = options.getInteger('amount');
      const messages = await channel.messages.fetch({ limit: amount });
      await channel.bulkDelete(messages);
      return interaction.reply({ content: `✅ Deleted ${messages.size} messages.`, ephemeral: true });
    }

    if (commandName === 'purgeuser') {
      if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply('❌ No permission.');
      const user = options.getUser('user');
      const amount = options.getInteger('amount');
      const messages = await channel.messages.fetch({ limit: 100 });
      const userMessages = messages.filter(m => m.author.id === user.id).first(amount);
      await channel.bulkDelete(userMessages);
      return interaction.reply({ content: `✅ Deleted ${userMessages.length} messages from ${user.tag}.`, ephemeral: true });
    }

    // Add other commands (role, unrole, roleall, etc.) using same pattern

  } catch (err) {
    console.error(err);
    return interaction.reply('❌ An error occurred while executing the command.');
  }
});

client.login(process.env.TOKEN);
