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
  description: "Show the SHADOW help menu",
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Display the help menu"),

  async execute(context) {
    const isSlash = !!context.interaction;
    const user = isSlash ? context.interaction.user : context.message.author;
    const guild = isSlash ? context.interaction.guild : context.message.guild;
    const client = isSlash ? context.interaction.client : context.message.client;

    // 🧠 Auto-load commands
    const commandsPath = path.join(__dirname);
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js") && file !== "help.js");

    const categories = {};
    for (const file of commandFiles) {
      const cmd = require(path.join(commandsPath, file));
      const cat = cmd.category || "General";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(cmd.data?.name || cmd.name);
    }

    const totalCommands = commandFiles.length;

    // 🎨 Main Help Embed
    const embed = new EmbedBuilder()
      .setAuthor({ name: "𝙎𝙃𝘼𝘿𝙊𝙒 Help Menu", iconURL: client.user.displayAvatarURL() })
      .setDescription(
        `> **Prefix Information**\nMy prefix for **${guild.name}** is \`${PREFIX}\`\n` +
        `You can also mention ${client.user} to use me.\n\n` +
        `> **Help Info**\nUse \`${PREFIX}command\` or \`/command\` to run any command.\n` +
        `Currently loaded **${totalCommands} commands** across **${Object.keys(categories).length} categories**.\n\n` +
        `> **Links:**\n[Support Server](${SERVER_LINK})`
      )
      .setThumbnail(client.user.displayAvatarURL())
      .setColor("Blue")
      .setFooter({ text: "𝙎𝙃𝘼𝘿𝙊𝙒 • Help Center", iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    // 🔘 Buttons
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("🏠 Home")
        .setStyle(ButtonStyle.Primary)
        .setCustomId("help_home"),
      new ButtonBuilder()
        .setLabel("📜 Commands List")
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("help_list"),
      new ButtonBuilder()
        .setLabel("🔘 Buttons Menu")
        .setStyle(ButtonStyle.Success)
        .setCustomId("help_buttons")
    );

    // 🔽 Dropdown (categories)
    const dropdown = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("help_select")
        .setPlaceholder("Select a category to view commands")
        .addOptions(
          Object.keys(categories).map((cat) => ({
            label: cat,
            description: `View ${categories[cat].length} commands`,
            value: cat,
          }))
        )
    );

    const msg = isSlash
      ? await context.interaction.reply({
          embeds: [embed],
          components: [buttons, dropdown],
          fetchReply: true,
        })
      : await context.message.reply({
          embeds: [embed],
          components: [buttons, dropdown],
        });

    // 🕹️ Collector for buttons + menu
    const collector = msg.createMessageComponentCollector({ time: 60_000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== user.id)
        return i.reply({ content: "❌ You can’t control this menu!", ephemeral: true });

      if (i.customId === "help_home") {
        await i.update({ embeds: [embed], components: [buttons, dropdown] });
      } else if (i.customId === "help_list") {
        const listEmbed = new EmbedBuilder()
          .setTitle("📜 Commands List")
          .setDescription(
            Object.entries(categories)
              .map(([cat, cmds]) => `**${cat}**\n> ${cmds.join(", ")}`)
              .join("\n\n")
          )
          .setColor("Blue")
          .setFooter({ text: "Use buttons or select menu to navigate." });
        await i.update({ embeds: [listEmbed], components: [buttons, dropdown] });
      } else if (i.customId === "help_buttons") {
        const btnEmbed = new EmbedBuilder()
          .setTitle("🔘 Buttons Menu Info")
          .setDescription(
            "This panel lets you easily navigate between help pages.\n\n" +
            "🏠 **Home:** Show basic info\n📜 **Commands List:** Show all commands\n🔘 **Buttons Menu:** You’re here!"
          )
          .setColor("Blue");
        await i.update({ embeds: [btnEmbed], components: [buttons, dropdown] });
      } else if (i.customId === "help_select") {
        const selected = i.values[0];
        const cmds = categories[selected];
        const catEmbed = new EmbedBuilder()
          .setTitle(`📂 ${selected} Commands`)
          .setDescription(cmds.map((c) => `• \`${c}\``).join("\n"))
          .setColor("Blue")
          .setFooter({ text: `Total: ${cmds.length}` });
        await i.update({ embeds: [catEmbed], components: [buttons, dropdown] });
      }
    });

    collector.on("end", async () => {
      try {
        await msg.edit({ components: [] });
      } catch {}
    });
  },
};
