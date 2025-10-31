// commands/transcriptall.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const { createTranscript } = require("discord-html-transcripts");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "transcriptall",
  description: "📜 Generate transcripts for all text channels (HTML) and upload to transcript-log",
  data: new SlashCommandBuilder()
    .setName("transcriptall")
    .setDescription("📜 Generate transcripts for all text channels in this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute({ client, message, interaction }) {
    const guild = interaction ? interaction.guild : message.guild;
    const requester = interaction ? interaction.user : message.author;

    if (!guild) {
      const errMsg = "⚠️ This command can only be used inside a server.";
      if (interaction) return interaction.reply({ content: errMsg, ephemeral: true });
      return message.reply(errMsg);
    }

    if (interaction) await interaction.deferReply({ ephemeral: true }).catch(() => {});
    else await message.reply("🕐 Generating transcripts for all text channels... please wait.").catch(() => {});

    try {
      const logChannel = await ensureTranscriptLogChannel(guild, client);

      const textChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText);
      let created = 0;

      for (const [id, channel] of textChannels) {
        try {
          // create transcript for each channel (limit can be adjusted)
          const buffer = await createTranscript(channel, {
            limit: -1, // -1 usually means fetch all (library dependent)
            returnBuffer: true,
            fileName: `${channel.name}.html`,
            poweredBy: false,
            saveImages: true,
          });

          if (buffer && buffer.attachment) {
            const att = new AttachmentBuilder(buffer.attachment, { name: `${channel.name}.html` });
            const embed = new EmbedBuilder()
              .setTitle(`📄 Transcript: #${channel.name}`)
              .setDescription(`Transcript generated for ${channel} — requested by ${requester}`)
              .setTimestamp()
              .setColor("Aqua");

            await logChannel.send({ embeds: [embed], files: [att] }).catch((e) => {
              console.warn(`Failed to send transcript for #${channel.name}:`, e?.message || e);
            });

            created++;
            // small pause to avoid hitting rate limits
            await sleep(250);
          }
        } catch (e) {
          console.warn(`⚠️ Skipping #${channel.name}:`, e?.message || e);
        }
      }

      if (created === 0) {
        const none = "⚠️ No valid transcripts could be created.";
        if (interaction) return interaction.editReply({ content: none }).catch(() => {});
        return message.reply(none).catch(() => {});
      }

      const done = `✅ Generated ${created} transcript(s) and uploaded to ${logChannel}`;
      if (interaction) await interaction.editReply({ content: done }).catch(() => {});
      else await message.reply(done).catch(() => {});
    } catch (err) {
      console.error("❌ TranscriptAll error:", err);
      const fail = "⚠️ Failed to generate transcripts for the server. Try again later.";
      if (interaction) await interaction.editReply({ content: fail, ephemeral: true }).catch(() => {});
      else await message.reply(fail).catch(() => {});
    }
  },
};

async function ensureTranscriptLogChannel(guild, client) {
  const existing = guild.channels.cache.find((c) => c.name === "transcript-log" && c.type === ChannelType.GuildText);
  if (existing) return existing;

  const perms = [
    { id: guild.roles.everyone, deny: ["ViewChannel"] },
    { id: guild.members.me.roles.highest, allow: ["ViewChannel", "SendMessages", "AttachFiles", "EmbedLinks"] },
  ];

  guild.roles.cache.filter((r) => r.permissions.has(PermissionFlagsBits.Administrator)).forEach((r) => {
    perms.push({ id: r.id, allow: ["ViewChannel", "SendMessages", "AttachFiles", "EmbedLinks"] });
  });

  return await guild.channels.create({
    name: "transcript-log",
    type: ChannelType.GuildText,
    permissionOverwrites: perms,
  });
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
