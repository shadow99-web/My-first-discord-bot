const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const pinterest = require("scrape-pinterest");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pin")
    .setDescription("Fetch images or clips by topic")
    .addSubcommand(sub =>
      sub
        .setName("images")
        .setDescription("Fetch  images")
        .addStringOption(opt =>
          opt.setName("topic").setDescription("Search topic").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("clips")
        .setDescription("Fetch  clips")
        .addStringOption(opt =>
          opt.setName("topic").setDescription("Search topic").setRequired(true)
        )
    ),

  async execute(context) {
    const isPrefix = context.isPrefix;
    const interaction = context.interaction;
    const message = context.message;
    const client = context.client;

    let sub, topic;

    if (isPrefix) {
      // Example: !pin images cats
      const args = message.content.trim().split(/\s+/).slice(1);
      sub = args[0];
      topic = args.slice(1).join(" ");
      if (!sub || !["images", "clips"].includes(sub))
        return message.reply("❌ Usage: `!pin <images|clips> <topic>`");
      if (!topic) return message.reply("❌ Please specify a topic to search.");
    } else {
      sub = interaction.options.getSubcommand();
      topic = interaction.options.getString("topic");
      await interaction.deferReply();
    }

    try {
      const results = await pinterest.scrape(topic);
      if (!results || results.length === 0) {
        const reply = `❌ No results found for **${topic}** on Pinterest.`;
        return isPrefix ? message.reply(reply) : interaction.editReply(reply);
      }

      // Filter and limit
      let filtered =
        sub === "clips"
          ? results.filter(r => r.video && r.video.url)
          : results.filter(r => r.image);

      filtered = filtered.slice(0, 15);
      if (!filtered.length) {
        const reply = `❌ No ${sub} found for **${topic}**.`;
        return isPrefix ? message.reply(reply) : interaction.editReply(reply);
      }

      let index = 0;

      const generateEmbed = () => {
        const item = filtered[index];
        const embed = new EmbedBuilder()
          .setColor("Red")
          .setTitle(`📌 𝙎𝙃𝘼𝘿𝙊𝙒 ${sub === "clips" ? "Clip" : "Image"} — ${topic}`)
          .setURL(item.url)
          .setDescription(`Result **${index + 1}/${filtered.length}**`)
          .setFooter({ text: "Source: Pinterest" })
          .setTimestamp();

        if (sub === "images") embed.setImage(item.image);
        else embed.setDescription(`🎬 [Watch Clip](${item.video.url})\nResult **${index + 1}/${filtered.length}**`);

        return embed;
      };

      const getComponents = () => {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("prev")
            .setLabel("◀️ Prev")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(index === 0),
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("▶️ Next")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(index === filtered.length - 1),
          new ButtonBuilder()
            .setLabel("⬇️ Download")
            .setStyle(ButtonStyle.Link)
            .setURL(sub === "clips" ? filtered[index].video.url : filtered[index].image)
        );
        return [row];
      };

      const sent = isPrefix
        ? await message.reply({
            embeds: [generateEmbed()],
            components: getComponents(),
          })
        : await interaction.editReply({
            embeds: [generateEmbed()],
            components: getComponents(),
          });

      const msg = isPrefix ? sent : await interaction.fetchReply();

      const collector = msg.createMessageComponentCollector({
        time: 60 * 1000,
      });

      collector.on("collect", async i => {
        if (i.user.id !== (isPrefix ? message.author.id : interaction.user.id))
          return i.reply({
            content: "⛔ Only the command user can control this.",
            ephemeral: true,
          });

        if (i.customId === "prev" && index > 0) index--;
        if (i.customId === "next" && index < filtered.length - 1) index++;

        await i.update({
          embeds: [generateEmbed()],
          components: getComponents(),
        });
      });

      collector.on("end", async () => {
        await msg.edit({ components: [] }).catch(() => {});
      });
    } catch (err) {
      console.error(err);
      const reply = "❌ Failed to fetch data from Pinterest. Try again later.";
      isPrefix ? message.reply(reply) : interaction.editReply(reply);
    }
  },
};
