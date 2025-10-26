const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { WelcomeLeave }= require("canvacord"); // make sure this matches your package.json
const { getGreet, getChannel } = require("../Handlers/greetHandler");
const { getAutoroleConfig } = require("../Handlers/autoroleHandler");
const WelcomeSettings = require("../models/WelcomeSettings.js");

module.exports = (client) => {
  client.on("guildMemberAdd", async (member) => {
    const guildId = member.guild.id;

    // ===== Welcome Card =====
    try {
      const settings = await WelcomeSettings.findOne({ guildId });
      if (!settings || !settings.channelId) return;

      const channel = member.guild.channels.cache.get(settings.channelId);
      if (!channel) return;

      const avatar = member.user.displayAvatarURL({ extension: "png", size: 256 }) || "https://cdn.discordapp.com/embed/avatars/0.png";
      const background = settings.background || "https://i.imgur.com/3ZUrjUP.jpeg";

      // canvacord WelcomeLeave
      const welcomer = new canvacord.WelcomeLeave()
        .setAvatar(avatar)
        .setBackground("IMAGE", background)
        .setTitle(`Welcome ${member.user.username}!`, "#FFFFFF")
        .setSubtitle(`to ${member.guild.name}`, "#FFFFFF")
        .setOpacityOverlay(0.5)
        .setColorCircle("#FFFFFF")
        .setColorOverlay("#5865F2")
        .setTypeOverlay("ROUNDED");

      const data = await welcomer.build("Cascadia Code PL, Noto Color Emoji");
      const attachment = new AttachmentBuilder(data, { name: "WelcomeCard.png" });
      await channel.send({ content: `🎉 Welcome ${member}!`, files: [attachment] });

    } catch (err) {
      console.error("❌ Welcome card error:", err);
    }

    // ===== Greet System =====
    try {
      const greet = await getGreet(guildId);
      const channelId = (await getChannel(guildId)) || member.guild.systemChannelId;
      if (greet && channelId) {
        const greetChannel = member.guild.channels.cache.get(channelId);
        if (!greetChannel) return;

        let text = greet.text || "";
        text = text.replace(/{user}/gi, member.toString())
                   .replace(/{server}/gi, member.guild.name || "This Server")
                   .replace(/{count}/gi, member.guild.memberCount.toString());

        const embed = new EmbedBuilder()
          .setColor("Blue")
          .setDescription(text || "👋 Welcome!")
          .setFooter({ text: `Added by ${greet.author || "Bot"}` });

        await greetChannel.send({ embeds: [embed], files: greet.attachment ? [greet.attachment] : [] });
      }
    } catch (err) {
      console.error("❌ Failed to send greet:", err);
    }

    // ===== Autorole =====
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
  });
};
