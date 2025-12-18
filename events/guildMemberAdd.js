const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const canvacord = require("canvacord");
const WelcomeSettings = require("../models/WelcomeSettings.js");
const { getGreet, getChannel } = require("../Handlers/greetHandler");
const { getAutoroleConfig } = require("../Handlers/autoroleHandler");
const MemberStats = require("../models/MemberStats");

// ✅ Helper: validate URL
const isValidUrl = (url) => {
  try { new URL(url); return true; } 
  catch { return false; }
};

module.exports = (client) => {
  client.on("guildMemberAdd", async (member) => {
    const guildId = member.guild.id;

    // =================== 🌟 Welcome Card ===================
    try {
      const settings = await WelcomeSettings.findOne({ guildId });
      if (!settings || !settings.channelId) return;

      const channel = member.guild.channels.cache.get(settings.channelId);
      if (!channel) return;

      const avatar = member.user.displayAvatarURL({ format: "png", size: 256 });
      const background = isValidUrl(settings.background)
        ? settings.background
        : "https://i.imgur.com/3ZUrjUP.jpeg";

      const card = new canvacord.Welcomer()
        .setUsername(member.user.username)
        .setDiscriminator(member.user.discriminator)
        .setMemberCount(member.guild.memberCount)
        .setGuildName(member.guild.name)
        .setAvatar(avatar)
        .setBackground(background) // ✅ validated URL
        .setColor("title", "#ffffff")
        .setColor("username-box", "#5865F2")
        .setColor("message-box", "#2C2F33")
        .setText("title", "WELCOME!")
        .setText("message", `to ${member.guild.name}!`)
        .setText("member-count", `You're member #${member.guild.memberCount}`);

      const buffer = await card.build();
      const attachment = new AttachmentBuilder(buffer, { name: "welcome.png" });

      await channel.send({
        content: `<a:HeartsForAll:1417072462499414067> Welcome ${member}!`,
        files: [attachment],
      });

      console.log(`✅ Welcome card sent for ${member.user.tag}`);
    } catch (err) {
      console.error("❌ Welcome card error:", err);
    }


    // =================== 👋 Greet System ===================
    try {
      const greet = await getGreet(guildId);
      const channelId = (await getChannel(guildId)) || member.guild.systemChannelId;
      if (greet && channelId) {
        const greetChannel = member.guild.channels.cache.get(channelId);
        if (!greetChannel) return;

        let text = greet.text || "";
        text = text
          .replace(/{user}/gi, member.toString())
          .replace(/{server}/gi, member.guild.name || "This Server")
          .replace(/{count}/gi, member.guild.memberCount.toString());

        const embed = new EmbedBuilder()
          .setColor("Blue")
          .setDescription(text || "👋 Welcome!")
          .setFooter({ text: `Added by ${greet.author || "Bot"}` });

        let files = [];

if (greet.attachment?.url) {
  const res = await fetch(greet.attachment.url);
  const buffer = await res.buffer();

  const fileName = greet.attachment.name || "greet.png";

  files.push({
    attachment: buffer,
    name: fileName
  });

  if (greet.attachment.contentType?.startsWith("image")) {
    embed.setImage("attachment://" + fileName);
  }
}

await greetChannel.send({
  embeds: [embed],
  files
});
      }
    } catch (err) {
      console.error("❌ Failed to send greet:", err);
    }

    // =================== 🤖 Autorole System ===================
    try {
      const guildConfig = await getAutoroleConfig(guildId);
      if (!guildConfig) return;

      const roleIds = member.user.bot ? guildConfig.bots : guildConfig.humans;
      if (!roleIds || roleIds.length === 0) return;

      const applied = [];
      for (const roleId of roleIds) {
        const role = member.guild.roles.cache.get(roleId);
        if (!role) continue;

        try {
          await member.roles.add(roleId, "Autorole: assigned on join");
          applied.push(`<@&${roleId}>`);
        } catch (err) {
          console.warn(`❌ Failed to add role ${roleId} to ${member.user.tag}: ${err.message}`);
        }
      }

      if (applied.length > 0) {
        try {
          const blueHeart = "<a:blue_heart:1414309560231002194>";
          const dmEmbed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`Welcome to ${member.guild.name || "our server"}!`)
            .setDescription(`${blueHeart} You have been given the following role(s):\n${applied.join(", ")}`)
            .setTimestamp();

          await member.send({ embeds: [dmEmbed] });
        } catch (dmErr) {
          console.warn(`❌ Could not DM ${member.user.tag}: ${dmErr.message}`);
        }
      }
    } catch (err) {
      console.error("❌ Failed to assign autorole:", err);
    }
  // =================== 📊 Member Stats (Joins Counter) ===================
    try {
      const today = new Date().toISOString().split("T")[0];
      await MemberStats.updateOne(
        { guildId, date: today },
        { $inc: { joins: 1 } },
        { upsert: true }
      );
      console.log(`📈 Recorded join for ${member.guild.name} (${today})`);
    } catch (err) {
      console.error("❌ Error saving join stats:", err);
    }
  });
};
