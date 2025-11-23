const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
} = require("discord.js");

module.exports = {
  name: "embed",
  description: "Create a custom embed with buttons (slash + prefix supported)",
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Create a custom embed interactively")
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("Channel to send the embed to")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute({ client, interaction, message, args, isPrefix }) {
    const user = isPrefix ? message.author : interaction.user;
    const targetChannel = isPrefix
      ? message.mentions.channels.first() || message.channel
      : interaction.options.getChannel("channel") || interaction.channel;

    const me = interaction?.guild?.members?.me || message.guild.members.me;

    if (!targetChannel.permissionsFor(me)?.has(["SendMessages", "EmbedLinks"])) {
      const msg = "❌ I don’t have permission to send embeds in that channel!";
      return isPrefix
        ? message.reply(msg)
        : interaction.reply({ content: msg, ephemeral: true });
    }

    if (!isPrefix) await interaction.deferReply({ ephemeral: true });

    const blueHeart = "<a:blue_heart:1414309560231002194>";

    // ✨ Create base embed with author avatar + bot footer
    let embed = new EmbedBuilder()
      .setAuthor({
        name: ` ${user.username} `,
        iconURL: user.displayAvatarURL({ dynamic: true }),
      })
      .setTitle(` Custom Embed Builder `)
      .setDescription("Use the buttons below to customize this embed.")
      .setColor("#00BFFF")
      .setFooter({
        text: client.user.username,
        iconURL: client.user.displayAvatarURL(),
      });

    const getButtons = () =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("title")
          .setLabel("✨ Title")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("desc")
          .setLabel("🤍 Description")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("color")
          .setLabel("⚫ Color")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("image")
          .setLabel("⭐ Image")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("send")
          .setLabel("♥ Send")
          .setStyle(ButtonStyle.Danger)
      );

    const msg = isPrefix
      ? await message.reply({ embeds: [embed], components: [getButtons()] })
      : await interaction.editReply({ embeds: [embed], components: [getButtons()] });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === user.id,
      time: 150000,
    });

    collector.on("collect", async i => {
      if (i.customId === "send") {
        await targetChannel.send({ embeds: [embed] });
        await i.reply({
          content: `${blueHeart} Embed sent successfully to ${targetChannel}`,
          ephemeral: true,
        });
        collector.stop();
        return msg.edit({ components: [] });
      }

      const modal = new ModalBuilder()
        .setTitle("Customize Embed")
        .setCustomId(`modal_${i.customId}`);

      let input;
      if (i.customId === "title") {
        input = new TextInputBuilder()
          .setCustomId("input")
          .setLabel("Enter embed title")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);
      } else if (i.customId === "desc") {
        input = new TextInputBuilder()
          .setCustomId("input")
          .setLabel("Enter embed description")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);
      } else if (i.customId === "color") {
        input = new TextInputBuilder()
          .setCustomId("input")
          .setLabel("Enter color (name or hex like #ff0000)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);
      } else if (i.customId === "image") {
        input = new TextInputBuilder()
          .setCustomId("input")
          .setLabel("Enter image URL")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);
      }

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await i.showModal(modal);

      const modalSubmit = await i
        .awaitModalSubmit({
          filter: m => m.user.id === user.id,
          time: 60000,
        })
        .catch(() => null);

      if (!modalSubmit) return;

      const value = modalSubmit.fields.getTextInputValue("input");

      if (i.customId === "title") embed.setTitle(`${blueHeart} ${value} ${blueHeart}`);
      if (i.customId === "desc") embed.setDescription(value);
      if (i.customId === "color") embed.setColor(value);
      if (i.customId === "image") embed.setImage(value);

      await modalSubmit.reply({ content: "<a:purple_verified:1439271259190988954> Updated!", ephemeral: true });
      await msg.edit({ embeds: [embed] });
    });

    collector.on("end", () => {
      msg.edit({ components: [] }).catch(() => {});
    });
  },
};
