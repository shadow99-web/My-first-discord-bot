const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const DEV_IDS = ["1378954077462986772"]; // 👈 replace with your Discord user ID(s)

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nuke")
    .setDescription("⚠️ Developer-only: Wipe or reset this server (channels/roles)")
    .addBooleanOption(opt =>
      opt.setName("rebuild")
        .setDescription("Recreate default template after nuke (optional)")
        .setRequired(false)
    ),

  name: "nuke",
  description: "Developer-only: Wipe or reset this server (channels/roles)",

  async execute(context) {
    const isSlash = !!context.isCommand;
    const interaction = isSlash ? context : null;
    const message = !isSlash ? context.message : null;
    const member = isSlash ? interaction.member : message.member;
    const user = isSlash ? interaction.user : message.author;
    const guild = isSlash ? interaction.guild : message.guild;

    const rebuild = isSlash
      ? interaction.options.getBoolean("rebuild") || false
      : context.args?.[0] === "rebuild";

    if (!DEV_IDS.includes(user.id)) {
      const msg = "❌ Only the developer can use this command.";
      return isSlash
        ? interaction.reply({ content: msg, ephemeral: true })
        : message.reply(msg);
    }

    const embed = new EmbedBuilder()
      .setTitle("⚠️ Nuke Confirmation")
      .setDescription(
        `You are about to **nuke** \`${guild.name}\`\n\n` +
        `• All channels and categories will be **deleted**.\n` +
        `• All roles (except @everyone) will be **deleted**.\n` +
        (rebuild ? "• A clean layout will be **recreated.**" : "") +
        `\n\nAre you sure you want to continue?`
      )
      .setColor("Red")
      .setTimestamp()
      .setFooter({ text: "Developer-only command" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_nuke")
        .setLabel("💣 Confirm Nuke")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("cancel_nuke")
        .setLabel("❌ Cancel")
        .setStyle(ButtonStyle.Secondary)
    );

    const replyOptions = { embeds: [embed], components: [row] };
    const sent = isSlash
      ? await interaction.reply(replyOptions)
      : await message.reply(replyOptions);

    const collector = sent.createMessageComponentCollector({
      time: 30_000,
      filter: i => i.user.id === user.id
    });

    collector.on("collect", async i => {
      if (i.customId === "cancel_nuke") {
        await i.update({ content: "❎ Nuke canceled.", components: [], embeds: [] });
        return collector.stop();
      }

      if (i.customId === "confirm_nuke") {
        await i.update({
          content: "💣 Nuking server… please wait.",
          components: [],
          embeds: []
        });

        console.log(`[NUKE] ${user.tag} initiated a nuke in ${guild.name} (${guild.id})`);

        // Delete channels
        for (const [id, channel] of guild.channels.cache) {
          try {
            await channel.delete("Nuke command executed");
          } catch (err) {
            console.warn(`[NUKE] Failed to delete channel ${channel.name}:`, err.message);
          }
        }

        // Delete roles (except @everyone)
        for (const [id, role] of guild.roles.cache) {
          if (role.name === "@everyone") continue;
          try {
            await role.delete("Nuke command executed");
          } catch (err) {
            console.warn(`[NUKE] Failed to delete role ${role.name}:`, err.message);
          }
        }

        // Optional rebuild
        if (rebuild) {
          const category = await guild.channels.create({
            name: "General",
            type: 4
          });

          await guild.channels.create({
            name: "welcome",
            type: 0,
            parent: category.id
          });
          await guild.channels.create({
            name: "general-chat",
            type: 0,
            parent: category.id
          });
          await guild.channels.create({
            name: "voice-channel",
            type: 2,
            parent: category.id
          });
        }

        const doneEmbed = new EmbedBuilder()
          .setTitle("💥 Nuke Complete")
          .setDescription(`Server **${guild.name}** has been wiped successfully.`)
          .setColor("Green")
          .setTimestamp();

        await guild.systemChannel?.send({ embeds: [doneEmbed] }).catch(() => {});
        try {
          await user.send(`✅ **Nuke complete** on **${guild.name}** (${guild.id})`);
        } catch {}

        collector.stop();
      }
    });

    collector.on("end", () => {
      if (!sent.editable) return;
      sent.edit({ components: [] }).catch(() => {});
    });
  }
};
