const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ComponentType,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  name: "inactive",
  description: "Find and remove inactive members (slash + prefix)",
  data: new SlashCommandBuilder()
    .setName("inactive")
    .setDescription("Find and remove inactive members from the server safely.")
    .addIntegerOption(opt =>
      opt
        .setName("days")
        .setDescription("Inactive for how many days?")
        .setMinValue(1)
        .setMaxValue(365)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(ctx) {
    const { interaction, message, isPrefix, args, safeReply } = ctx;

    // Safe helper for replies
    const reply = async (content) => {
      if (!isPrefix && typeof safeReply === "function") return safeReply(content);
      if (isPrefix && message) {
        if (typeof content === "string") return message.reply(content).catch(() => {});
        return message.reply(content).catch(() => {});
      }
      if (interaction?.reply) return interaction.reply(content).catch(() => {});
    };

    try {
      const guild = isPrefix ? message.guild : interaction?.guild;
      if (!guild) return reply({ content: "❌ Use this command in a server.", ephemeral: true });

      const member = isPrefix ? message.member : guild.members.cache.get(interaction?.user?.id);
      if (!member?.permissions?.has(PermissionFlagsBits.KickMembers))
        return reply({ content: "⚠️ You don’t have permission to use this command.", ephemeral: true });

      // ✅ Safely get days no matter what
      let days = 30;
      if (isPrefix && args?.length) {
        const parsed = parseInt(args[0]);
        if (!isNaN(parsed)) days = parsed;
      } else if (interaction?.options?.getInteger) {
        const opt = interaction.options.getInteger("days");
        if (opt) days = opt;
      }

      // Defer reply (slash only)
      if (!isPrefix && interaction?.deferred === false && typeof interaction.deferReply === "function") {
        await interaction.deferReply({ flags: 64 }).catch(() => {}); // ⚠️ uses flags instead of deprecated ephemeral
      }

      await guild.members.fetch();
      const now = Date.now();
      const cutoff = now - days * 24 * 60 * 60 * 1000;

      const inactive = guild.members.cache.filter(m => {
        if (m.user.bot) return false;
        const joined = m.joinedTimestamp || 0;
        const lastMsg = m.lastMessage?.createdTimestamp || 0;
        const ref = lastMsg || joined;
        return ref < cutoff;
      });

      if (inactive.size === 0)
        return reply({ content: `✅ No inactive members found older than ${days} days.`, flags: 64 });

      const arr = Array.from(inactive.values());
      const pageSize = 20;
      let page = 0;
      const totalPages = Math.ceil(arr.length / pageSize);
      const invokerId = isPrefix ? message.author.id : interaction.user.id;

      const buildEmbed = () => {
        const start = page * pageSize;
        const slice = arr.slice(start, start + pageSize);
        const desc = slice
          .map((m, i) => `\`${start + i + 1}.\` ${m.user.tag} — joined <t:${Math.floor(m.joinedTimestamp / 1000)}:R>`)
          .join("\n");
        return new EmbedBuilder()
          .setTitle(`<a:blue_heart:1414309560231002194> Inactive Members`)
          .setDescription(desc || "No members here.")
          .setColor("Blurple")
          .setFooter({ text: `Page ${page + 1}/${totalPages} • ${arr.length} total` });
      };

      const prev = new ButtonBuilder().setCustomId("inactive_prev").setLabel("◀").setStyle(ButtonStyle.Secondary);
      const next = new ButtonBuilder().setCustomId("inactive_next").setLabel("▶").setStyle(ButtonStyle.Secondary);
      const confirm = new ButtonBuilder().setCustomId("inactive_confirm").setLabel("✅ Confirm").setStyle(ButtonStyle.Danger);
      const cancel = new ButtonBuilder().setCustomId("inactive_cancel").setLabel("❌ Cancel").setStyle(ButtonStyle.Secondary);

      const row = () => new ActionRowBuilder().addComponents(
        prev.setDisabled(page === 0),
        next.setDisabled(page === totalPages - 1),
        confirm,
        cancel
      );

      let sent;
      if (isPrefix) sent = await message.reply({ embeds: [buildEmbed()], components: [row()] });
      else sent = await interaction.editReply({ embeds: [buildEmbed()], components: [row()] });

      const collector = sent.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60_000,
      });

      collector.on("collect", async (btn) => {
        if (btn.user.id !== invokerId) return btn.reply({ content: "Not your session.", flags: 64 });
        if (btn.customId === "inactive_prev") {
          page--;
          await btn.update({ embeds: [buildEmbed()], components: [row()] });
        } else if (btn.customId === "inactive_next") {
          page++;
          await btn.update({ embeds: [buildEmbed()], components: [row()] });
        } else if (btn.customId === "inactive_cancel") {
          await btn.update({ content: "❌ Cancelled.", embeds: [], components: [] });
          collector.stop("cancelled");
        } else if (btn.customId === "inactive_confirm") {
          await btn.update({ content: `⏳ Removing ${arr.length} inactive members...`, embeds: [], components: [] });
          let removed = 0;
          for (const member of arr) {
            if (!member.kickable) continue;
            await member.kick(`Inactive ${days}+ days`).catch(() => {});
            removed++;
          }
          const doneMsg = `✅ Removed ${removed}/${arr.length} inactive members (>${days} days).`;
          if (isPrefix) await message.channel.send(doneMsg);
          else await interaction.followUp({ content: doneMsg, flags: 64 });
          collector.stop("done");
        }
      });

      collector.on("end", async (collected, reason) => {
        if (reason === "time") {
          try {
            await sent.edit({ content: "⌛ Timed out — no members were removed.", embeds: [], components: [] });
          } catch {}
        }
      });
    } catch (err) {
      console.error("❌ Inactive command error:", err);
      reply({ content: "⚠️ Something went wrong while executing the command.", flags: 64 });
    }
  },
};
