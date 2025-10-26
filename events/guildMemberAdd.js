// events/guildMemberAdd.js
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { getGreet, getChannel } = require("../Handlers/greetHandler");
const { getAutoroleConfig } = require("../Handlers/autoroleHandler");
const WelcomeSettings = require("../models/WelcomeSettings.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

module.exports = (client) => {
  client.on("guildMemberAdd", async (member) => {
    const guildId = member.guild.id;

    // ========== 🌟 Modern Welcome Card System ==========
    try {
      const settings = await WelcomeSettings.findOne({ guildId });
      if (settings && settings.channelId) {
        const channel = member.guild.channels.cache.get(settings.channelId);
        if (channel) {
          // --- Guarantee a valid background URL string
          let bgUrl =
            typeof settings.background === "string" && settings.background.trim()
              ? settings.background
              : "https://i.imgur.com/3ZUrjUP.jpeg";
          
          let background;
          try {
            background = await loadImage(bgUrl);
          } catch (err) {
            // fallback if settings.background is broken
            bgUrl = "https://i.imgur.com/3ZUrjUP.jpeg";
            background = await loadImage(bgUrl);
          }

          const canvas = createCanvas(1000, 400);
          const ctx = canvas.getContext("2d");
          ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

          // Overlay glow
          ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // --- Guarantee a valid avatar URL string
          let avatarURL = member?.user?.displayAvatarURL?.({ extension: "png", size: 256 });
          if (typeof avatarURL !== "string" || avatarURL.length === 0) {
            avatarURL = "https://cdn.discordapp.com/embed/avatars/0.png";
          }
          let avatar;
          try {
            avatar = await loadImage(avatarURL);
          } catch (err) {
            avatar = await loadImage("https://cdn.discordapp.com/embed/avatars/0.png");
          }

          ctx.save();
          ctx.beginPath();
          ctx.arc(200, 200, 100, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(avatar, 100, 100, 200, 200);
          ctx.restore();

          // --- Always ensure non-empty strings for user and guild names
          const username =
            typeof member?.user?.username === "string" && member.user.username.trim()
              ? member.user.username
              : "New Member";
          const guildName =
            typeof member?.guild?.name === "string" && member.guild.name.trim()
              ? member.guild.name
              : "This Server";

          // --- All fillText inputs guaranteed as safe strings
          ctx.font = "bold 55px Sans";
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "#00ffff";
          ctx.shadowBlur = 30;
          ctx.fillText("Welcome", 360, 170);

          ctx.font = "bold 45px Sans";
          ctx.shadowBlur = 25;
          ctx.fillText(username, 360, 250);

          ctx.font = "30px Sans";
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#d0d0d0";
          ctx.fillText(`to ${guildName}!`, 360, 310);

          const attachment = new AttachmentBuilder(canvas.toBuffer(), {
            name: "welcome.png",
          });

          await channel.send({
            content: `🎉 Welcome ${member}!`,
            files: [attachment],
          });
        }
      }
    } catch (err) {
      console.error("❌ Welcome card error:", err);
    }

    // === 👋 Greet System (Embed/Text) ===
    try {
      const greet = await getGreet(guildId);
      const channelId = (await getChannel(guildId)) || member.guild.systemChannelId;

      if (greet && channelId) {
        const channel = member.guild.channels.cache.get(channelId);
        if (channel) {
          let text = greet.text || "";
          text = text
            .replace(/{user}/gi, member.toString())
            .replace(/{server}/gi, member.guild.name || "This Server")
            .replace(/{count}/gi, member.guild.memberCount.toString());

          const embed = new EmbedBuilder()
            .setColor("Blue")
            .setDescription(text || "👋 Welcome!")
            .setFooter({ text: `Added by ${greet.author || "Bot"}` });

          await channel.send({
            embeds: [embed],
            files: greet.attachment ? [greet.attachment] : [],
          });
        }
      }
    } catch (err) {
      console.error("❌ Failed to send greet:", err);
    }

    // === 🤖 Autorole System ===
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
            .setDescription(
              `${blueHeart} You have been given the following role(s):
${applied.join(", ")}`
            )
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
