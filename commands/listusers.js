const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  name: "listusers",
  description: "List server members with pagination and animated blue heart emoji",
  
  data: new SlashCommandBuilder()
    .setName("listusers")
    .setDescription("List all members of the server"),

  async execute(interactionOrMessage) {
    const isInteraction = interactionOrMessage.isCommand?.();
    const channel = interactionOrMessage.channel;

    try {
      const guild = interactionOrMessage.guild;
      await guild.members.fetch();

      const members = guild.members.cache.map(m => ({
        tag: m.user.tag,
        mention: `<@${m.id}>`
      }));

      if (!members.length) return channel.send("No members found!");

      const pageSize = 15;
      let page = 0;
      const totalPages = Math.ceil(members.length / pageSize);

      const generateEmbed = (page) => {
        const membersPage = members.slice(page * pageSize, (page + 1) * pageSize);
        return new EmbedBuilder()
          .setTitle(`Server Members (Page ${page + 1}/${totalPages})`)
          .setColor("Blue")
          .setDescription(
            membersPage.map(u => `<a:blue_heart_1414309560231002194:1414309560231002194> ${u.mention} (${u.tag})`).join("\n")
          );
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

      const msg = await channel.send({ embeds: [generateEmbed(page)], components: [row] });

      const collector = msg.createMessageComponentCollector({ time: 120000 });

      collector.on("collect", async (interaction) => {
        if (!interaction.isButton()) return;
        page += interaction.customId === "next" ? 1 : -1;

        row.components[0].setDisabled(page === 0);
        row.components[1].setDisabled(page === totalPages - 1);

        await interaction.update({ embeds: [generateEmbed(page)], components: [row] });
      });

      collector.on("end", () => {
        row.components.forEach(btn => btn.setDisabled(true));
        msg.edit({ components: [row] }).catch(() => {});
      });

      if (isInteraction) await interactionOrMessage.deferReply({ ephemeral: false });

    } catch (error) {
      console.error(error);
      channel.send("❌ Something went wrong.");
    }
  },
};
