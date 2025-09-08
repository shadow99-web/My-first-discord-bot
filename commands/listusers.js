const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  name: "listusers",
  description: "List all server members with pagination",
  data: new SlashCommandBuilder()
    .setName("listusers")
    .setDescription("List all members of the server"),

  async execute({ interaction, message, args, isPrefix, client }) {
    const blueHeart = "<a:blue_heart_1414309560231002194:1414309560231002194>";
    const isInteraction = !!interaction;
    const guild = interaction?.guild || message.guild;

    // Unified safe reply function
    const reply = async (options) => {
      try {
        if (isInteraction) {
          if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: false });
          if (!interaction.replied) return interaction.reply(options);
          return interaction.followUp(options);
        } else {
          return message.channel.send(options);
        }
      } catch (err) {
        console.error("Failed to reply safely:", err);
      }
    };

    try {
      // Fetch all members
      await guild.members.fetch();
      const members = guild.members.cache.map(m => ({
        mention: `<@${m.id}>`,
        tag: m.user.tag
      }));

      if (!members.length) return reply({ content: "No members found!" });

      const pageSize = 15;
      let page = 0;
      const totalPages = Math.ceil(members.length / pageSize);

      // Generate embed for a page
      const generateEmbed = (page) => {
        const membersPage = members.slice(page * pageSize, (page + 1) * pageSize);
        const description = membersPage
          .map(u => `${blueHeart} **${u.mention}** (\`${u.tag}\`)`)
          .join("\n");

        return new EmbedBuilder()
          .setTitle(`❤ Server Members`)
          .setColor("#0099ff")
          .setDescription(description)
          .setFooter({ text: `Page ${page + 1} of ${totalPages} | Total Members: ${guild.memberCount}` })
          .setTimestamp();
      };

      // Buttons
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

      // Send initial embed
      const msg = await reply({ embeds: [generateEmbed(page)], components: [row] });

      // Collector for pagination
      const collector = msg.createMessageComponentCollector({ time: 120000 });

      collector.on("collect", async (i) => {
        if (!i.isButton()) return;

        page += i.customId === "next" ? 1 : -1;

        row.components[0].setDisabled(page === 0);
        row.components[1].setDisabled(page === totalPages - 1);

        try {
          await i.update({ embeds: [generateEmbed(page)], components: [row] });
        } catch (err) {
          console.error("Collector interaction failed:", err);
        }
      });

      collector.on("end", () => {
        row.components.forEach(btn => btn.setDisabled(true));
        msg.edit({ components: [row] }).catch(() => {});
      });

    } catch (error) {
      console.error(error);
      await reply({ content: "❌ Something went wrong." });
    }
  }
};
