const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Canvas = require("canvas");

module.exports = {
  name: "listusers",
  description: "List all members with avatars and pagination using Canvas.",
  async execute(message) {
    try {
      // Fetch all members
      await message.guild.members.fetch();
      const members = message.guild.members.cache.map(member => ({
        tag: member.user.tag,
        mention: `<@${member.id}>`,
        avatarURL: member.user.displayAvatarURL({ format: 'png', size: 64 })
      }));

      if (members.length === 0) return message.channel.send("No members found!");

      const pageSize = 15;
      let page = 0;
      const totalPages = Math.ceil(members.length / pageSize);

      // Function to create canvas image for current page
      const generateCanvas = async (membersPage) => {
        const width = 600;
        const height = 60 * membersPage.length + 20;
        const canvas = Canvas.createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#2C2F33';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Sans-serif';

        for (let i = 0; i < membersPage.length; i++) {
          const user = membersPage[i];

          // Draw avatar
          const avatar = await Canvas.loadImage(user.avatarURL);
          ctx.drawImage(avatar, 10, 10 + i * 60, 50, 50);

          // Draw username and mention with animated heart
          ctx.fillText(`💙 ${user.tag}`, 70, 40 + i * 60);
        }

        return canvas.toBuffer();
      };

      const generateEmbed = async (page) => {
        const membersPage = members.slice(page * pageSize, (page + 1) * pageSize);
        const imageBuffer = await generateCanvas(membersPage);

        return new EmbedBuilder()
          .setTitle(`Server Members (Page ${page + 1}/${totalPages})`)
          .setColor("Blue")
          .setImage('attachment://members.png');
      };

      // Initial message
      const membersPage = members.slice(0, pageSize);
      const canvasBuffer = await generateCanvas(membersPage);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("⬅ Previous")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("Next ➡")
          .setStyle(ButtonStyle.Primary)
      );

      const msg = await message.channel.send({
        embeds: [await generateEmbed(0)],
        files: [{ attachment: canvasBuffer, name: 'members.png' }],
        components: [row]
      });

      // Button collector
      const collector = msg.createMessageComponentCollector({ time: 120000 });

      collector.on("collect", async (interaction) => {
        if (!interaction.isButton()) return;

        if (interaction.customId === "next") page++;
        if (interaction.customId === "prev") page--;

        row.components[0].setDisabled(page === 0);
        row.components[1].setDisabled(page === totalPages - 1);

        const canvasBuffer = await generateCanvas(members.slice(page * pageSize, (page + 1) * pageSize));

        await interaction.update({
          embeds: [await generateEmbed(page)],
          files: [{ attachment: canvasBuffer, name: 'members.png' }],
          components: [row]
        });
      });

      collector.on("end", () => {
        row.components.forEach(button => button.setDisabled(true));
        msg.edit({ components: [row] }).catch(() => {});
      });

    } catch (error) {
      console.error("Error in listusers command:", error);
      message.channel.send("❌ Something went wrong while fetching members.");
    }
  },
};
