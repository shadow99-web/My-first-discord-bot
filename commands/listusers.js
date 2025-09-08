const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Canvas = require("canvas");

module.exports = {
  name: "listuserscanvas",
  description: "List members with avatars using Canvas (prefix + slash) and animated blue heart",
  
  // Slash command registration
  data: new SlashCommandBuilder()
    .setName("listuserscanvas")
    .setDescription("List all members of the server with avatars"),

  async execute(interactionOrMessage) {
    const isInteraction = interactionOrMessage.isCommand?.();
    const channel = isInteraction ? interactionOrMessage.channel : interactionOrMessage.channel;
    const author = isInteraction ? interactionOrMessage.user : interactionOrMessage.author;

    try {
      const guild = interactionOrMessage.guild;
      await guild.members.fetch();

      const members = guild.members.cache.map(member => ({
        tag: member.user.tag,
        mention: `<@${member.id}>`,
        avatarURL: member.user.displayAvatarURL({ format: 'png', size: 64 })
      }));

      if (!members.length) return channel.send("No members found!");

      const pageSize = 15;
      let page = 0;
      const totalPages = Math.ceil(members.length / pageSize);

      // Canvas generator
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
          const avatar = await Canvas.loadImage(user.avatarURL);
          ctx.drawImage(avatar, 10, 10 + i * 60, 50, 50); // avatar
          ctx.fillText(user.tag, 70, 40 + i * 60); // username
        }

        return canvas.toBuffer();
      };

      const generateEmbed = async (page) => {
        const membersPage = members.slice(page * pageSize, (page + 1) * pageSize);
        const imageBuffer = await generateCanvas(membersPage);

        return new EmbedBuilder()
          .setTitle(`Server Members (Page ${page + 1}/${totalPages})`)
          .setColor("Blue")
          .setDescription(
            membersPage.map(u => `<:blue_heart_1414309560231002194:1414309560231002194> ${u.mention}`).join("\n")
          )
          .setImage('attachment://members.png');
      };

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

      // Send initial message
      const initialBuffer = await generateCanvas(members.slice(0, pageSize));
      const msg = await channel.send({
        embeds: [await generateEmbed(0)],
        files: [{ attachment: initialBuffer, name: 'members.png' }],
        components: [row]
      });

      // Collector for buttons
      const collector = msg.createMessageComponentCollector({ time: 120000 });

      collector.on("collect", async (interaction) => {
        if (!interaction.isButton()) return;

        page += interaction.customId === "next" ? 1 : -1;

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
        row.components.forEach(btn => btn.setDisabled(true));
        msg.edit({ components: [row] }).catch(() => {});
      });

      // For slash commands, defer reply if needed
      if (isInteraction) await interactionOrMessage.deferReply({ ephemeral: false });

    } catch (error) {
      console.error(error);
      channel.send("❌ Something went wrong.");
    }
  },
};
