const { EmbedBuilder } = require("discord.js");
const ModLog = require("../models/ModLog");

module.exports = (client) => {
  const sendLog = async (guildId, embed) => {
    const log = await ModLog.findOne({ guildId });
    if (!log) return;
    const channel = client.channels.cache.get(log.channelId);
    if (!channel) return;
    channel.send({ embeds: [embed] }).catch(() => {});
  };

  // 🎯 Helper to make embeds fast
  const makeEmbed = (title, color, iconURL = null) => {
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setTimestamp();
    if (iconURL) embed.setThumbnail(iconURL);
    return embed;
  };

  // 🗑️ Message Deleted
  client.on("messageDelete", async (msg) => {
    if (!msg.guild || msg.author?.bot) return;
    const embed = makeEmbed("🗑️ MESSAGE DELETED", "Red", msg.author.displayAvatarURL())
      .setDescription(`**User:** ${msg.author} \n**Channel:** ${msg.channel}`)
      .addFields({ name: "📝 Content", value: msg.content?.slice(0, 1000) || "*[Embed/Attachment]*" })
      .setFooter({ text: `User ID: ${msg.author.id}` });
    sendLog(msg.guild.id, embed);
  });

  // ✏️ Message Edited
  client.on("messageUpdate", (oldMsg, newMsg) => {
    if (!newMsg.guild || newMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;
    const embed = makeEmbed("✏️ MESSAGE EDITED", "Yellow", newMsg.author.displayAvatarURL())
      .setDescription(`**User:** ${newMsg.author} \n**Channel:** ${newMsg.channel}`)
      .addFields(
        { name: "Before", value: oldMsg.content?.slice(0, 512) || "*Unknown*" },
        { name: "After", value: newMsg.content?.slice(0, 512) || "*Unknown*" }
      )
      .setFooter({ text: `User ID: ${newMsg.author.id}` });
    sendLog(newMsg.guild.id, embed);
  });

  // 👋 Member Join / Leave
  client.on("guildMemberAdd", (m) => {
    const embed = makeEmbed("✅ MEMBER JOINED", "Green", m.user.displayAvatarURL())
      .setDescription(`**User:** ${m.user.tag}\n**Account Created:** <t:${Math.floor(m.user.createdTimestamp / 1000)}:R>`)
      .setFooter({ text: `User ID: ${m.id}` });
    sendLog(m.guild.id, embed);
  });

  client.on("guildMemberRemove", (m) => {
    const embed = makeEmbed("💔 MEMBER LEFT", "Red", m.user.displayAvatarURL())
      .setDescription(`**User:** ${m.user.tag}`)
      .setFooter({ text: `User ID: ${m.id}` });
    sendLog(m.guild.id, embed);
  });

  // 🔨 Member Ban / Unban
  client.on("guildBanAdd", (ban) => {
    const embed = makeEmbed("🔨 MEMBER BANNED", "DarkRed", ban.user.displayAvatarURL())
      .setDescription(`**User:** ${ban.user.tag}`)
      .setFooter({ text: `User ID: ${ban.user.id}` });
    sendLog(ban.guild.id, embed);
  });

  client.on("guildBanRemove", (ban) => {
    const embed = makeEmbed("♻️ MEMBER UNBANNED", "DarkGreen", ban.user.displayAvatarURL())
      .setDescription(`**User:** ${ban.user.tag}`)
      .setFooter({ text: `User ID: ${ban.user.id}` });
    sendLog(ban.guild.id, embed);
  });

  // 🎭 Role Events
  client.on("roleCreate", (role) => {
    const embed = makeEmbed("🎭 ROLE CREATED", "Blue")
      .setDescription(`**Role:** ${role.name}`)
      .setFooter({ text: `Role ID: ${role.id}` });
    sendLog(role.guild.id, embed);
  });

  client.on("roleDelete", (role) => {
    const embed = makeEmbed("❤‍🩹 ROLE DELETED", "Red")
      .setDescription(`**Role:** ${role.name}`)
      .setFooter({ text: `Role ID: ${role.id}` });
    sendLog(role.guild.id, embed);
  });

  client.on("roleUpdate", (oldRole, newRole) => {
    if (oldRole.name === newRole.name) return;
    const embed = makeEmbed("📝 ROLE UPDATED", "Yellow")
      .addFields(
        { name: "Before", value: oldRole.name, inline: true },
        { name: "After", value: newRole.name, inline: true }
      )
      .setFooter({ text: `Role ID: ${newRole.id}` });
    sendLog(newRole.guild.id, embed);
  });

  // 📺 Channel Events
  client.on("channelCreate", (ch) => {
    const embed = makeEmbed("📺 CHANNEL CREATED", "Green")
      .setDescription(`**Name:** ${ch.name}\n**Type:** ${ch.type}`)
      .setFooter({ text: `Channel ID: ${ch.id}` });
    sendLog(ch.guild.id, embed);
  });

  client.on("channelDelete", (ch) => {
    const embed = makeEmbed("📛 CHANNEL DELETED", "Red")
      .setDescription(`**Name:** ${ch.name}`)
      .setFooter({ text: `Channel ID: ${ch.id}` });
    sendLog(ch.guild.id, embed);
  });

  client.on("channelUpdate", (oldCh, newCh) => {
    if (oldCh.name === newCh.name) return;
    const embed = makeEmbed("🔄 CHANNEL UPDATED", "Orange")
      .addFields(
        { name: "Before", value: oldCh.name, inline: true },
        { name: "After", value: newCh.name, inline: true }
      )
      .setFooter({ text: `Channel ID: ${newCh.id}` });
    sendLog(newCh.guild.id, embed);
  });

  // 🧑 Nickname Changes
  client.on("guildMemberUpdate", (oldMem, newMem) => {
    if (oldMem.nickname === newMem.nickname) return;
    const embed = makeEmbed("🟢 NICKNAME CHANGED", "Purple", newMem.user.displayAvatarURL())
      .addFields(
        { name: "User", value: `${newMem.user.tag}` },
        { name: "Before", value: oldMem.nickname || "None", inline: true },
        { name: "After", value: newMem.nickname || "None", inline: true }
      )
      .setFooter({ text: `User ID: ${newMem.id}` });
    sendLog(newMem.guild.id, embed);
  });

  // 🏰 Server Updates
  client.on("guildUpdate", (oldGuild, newGuild) => {
    const embed = makeEmbed("🌐 SERVER UPDATED", "Blue", newGuild.iconURL())
      .setDescription(`**Server:** ${newGuild.name}`);
    if (oldGuild.name !== newGuild.name)
      embed.addFields({ name: "🔅 Name Changed", value: `**${oldGuild.name}** → **${newGuild.name}**` });
    sendLog(newGuild.id, embed);
  });
};
