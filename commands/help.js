
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

const PREFIX = "!";
const SERVER_LINK = "https://discord.gg/Xp27hHZKrk";

module.exports = {
  name: "help",
  description: "Show the help menu",
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Display the help menu"),

  async execute({ interaction, message, client }) {
    const isSlash = !!interaction;

    const user =
      interaction?.user ||
      message?.author;

    const guild =
      interaction?.guild ||
      message?.guild;

    const botClient =
      interaction?.client ||
      message?.client ||
      client;

    if (!user || !guild || !botClient) return;

    // Load commands
    const commandsPath = path.join(__dirname);
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((f) => f.endsWith(".js") && f !== "help.js");

    const categories = {};
    for (const file of commandFiles) {
      const cmd = require(path.join(commandsPath, file));
      const cat = cmd.category || "General";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(cmd.data?.name || cmd.name);
    }

    const embed = new EmbedBuilder()
      .setAuthor({
        name: "  Help Menu",
        iconURL: botClient.user.displayAvatarURL(),
      })
      .setDescription(
        `> **Prefix:** \`${PREFIX}\`\n` +
        `> **Commands:** ${commandFiles.length}\n\n` +
        `[Support Server](${SERVER_LINK})`
      )
      .setThumbnail(botClient.user.displayAvatarURL())
      .setColor("Blue")
      .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("help_home")
        .setLabel("🏠 Home")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("help_list")
        .setLabel(" 💎 Commands")
        .setStyle(ButtonStyle.Secondary)
    );

    const dropdown = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("help_select")
        .setPlaceholder("Select category")
        .addOptions(
          Object.keys(categories).map((c) => ({
            label: c,
            value: c,
            description: `${categories[c].length} commands`,
          }))
        )
    );

    let msg;
    if (isSlash) {
      msg = await interaction.reply({
        embeds: [embed],
        components: [buttons, dropdown],
        fetchReply: true,
      });
    } else {
      msg = await message.reply({
        embeds: [embed],
        components: [buttons, dropdown],
      });
    }

    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== user.id)
        return i.reply({ content: "❌ Not for you", ephemeral: true });

      if (i.customId === "help_list") {
        const list = new EmbedBuilder()
          .setTitle(" <a:a_Online:1440333669863522485> Commands")
          .setDescription(
            Object.entries(categories)
              .map(([k, v]) => `**${k}**\n${v.map(x => `\`${x}\``).join(", ")}`)
              .join("\n\n")
          );

        await i.update({ embeds: [list], components: [buttons, dropdown] });
      } else {
        await i.update({ embeds: [embed], components: [buttons, dropdown] });
      }
    });

    collector.on("end", async () => {
      try {
        await msg.edit({ components: [] });
      } catch {}
    });
  },
};
