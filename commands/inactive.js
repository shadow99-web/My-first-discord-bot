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
    .addIntegerOption((opt) =>
      opt
        .setName("days")
        .setDescription("Inactive for how many days?")
        .setMinValue(1)
        .setMaxValue(365)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  /**
   * context: { client, interaction, message, args, isPrefix, safeReply }
   */
  async execute(context) {
    const { interaction, message, isPrefix, args, safeReply } = context;
    // Helper respond function that uses safeReply if available (slash), otherwise message.reply
    const reply = async (opts) => {
      if (!isPrefix && typeof safeReply === "function") return safeReply(opts);
      if (isPrefix && message) {
        if (typeof opts === "string") return message.reply(opts).catch(() => {});
        return message.reply(opts).catch(() => {});
      }
      // fallback
      if (interaction && interaction.reply) return interaction.reply(opts).catch(() => {});
    };

    try {
      const guild = isPrefix ? message.guild : interaction.guild;
      if (!guild) return reply({ content: "❌ This command must be used in a server.", ephemeral: true });

      // permission check (works for both)
      const invokerMember = isPrefix ? message.member : guild.members.cache.get(interaction.user.id);
      if (!invokerMember?.permissions?.has(PermissionFlagsBits.KickMembers)) {
        return reply({ content: "⚠️ You don’t have permission to use this command.", ephemeral: true });
      }

      const days = isPrefix ? (parseInt(args?.[0]) || 30) : (interaction.options.getInteger("days") || 30);

      // Defer reply for slash
      if (!isPrefix && interaction.deferred === false && typeof interaction.deferReply === "function") {
        await interaction.deferReply({ ephemeral: true }).catch(() => {});
      } else if (isPrefix) {
        // for prefix, send a small "working" reply (optional)
        // we won't spam — we'll proceed directly
      }

      // fetch members
      await guild.members.fetch();

      const now = Date.now();
      const cutoff = now - days * 24 * 60 * 60 * 1000;

      // Filter members: not bots, joined before cutoff AND (no recent message OR no lastMessage)
      const inactiveCollection = guild.members.cache.filter((m) => {
        if (m.user.bot) return false;
        const joined = m.joinedTimestamp || 0;
        const lastMsg = m.lastMessage?.createdTimestamp || 0;
        // consider either last message timestamp or join timestamp (if no messages)
        const ref = lastMsg || joined;
        return ref && ref < cutoff;
      });

      if (!inactiveCollection || inactiveCollection.size === 0) {
        return reply({ content: `✅ No inactive members found older than ${days} days.`, ephemeral: true });
      }

      const membersArray = Array.from(inactiveCollection.values());
      const pageSize = 20;
      let page = 0;
      const totalPages = Math.max(1, Math.ceil(membersArray.length / pageSize));
      const invokerId = isPrefix ? message.author.id : interaction.user.id;

      const buildEmbed = () => {
        const start = page * pageSize;
        const slice = membersArray.slice(start, start + pageSize);
        const desc =
          slice.map((m, idx) => `\`${start + idx + 1}.\` ${m.user.tag} — joined <t:${Math.floor((m.joinedTimestamp||0)/1000)}:R>`).join("\n") ||
          "No members on this page.";

        return new EmbedBuilder()
          .setTitle(`<a:blue_heart:1414309560231002194> Inactive Members`)
          .setDescription(desc)
          .setColor("Blurple")
          .setFooter({ text: `Page ${page + 1}/${totalPages} • Found ${membersArray.length} inactive` });
      };

      const prevBtn = new ButtonBuilder().setCustomId("inactive_prev").setLabel("◀️ Prev").setStyle(ButtonStyle.Secondary).setDisabled(page === 0);
      const nextBtn = new ButtonBuilder().setCustomId("inactive_next").setLabel("Next ▶️").setStyle(ButtonStyle.Secondary).setDisabled(page === totalPages - 1);
      const confirmBtn = new ButtonBuilder().setCustomId("inactive_confirm").setLabel("✅ Confirm").setStyle(ButtonStyle.Danger); // Danger because kicks
      const cancelBtn = new ButtonBuilder().setCustomId("inactive_cancel").setLabel("❌ Cancel").setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(prevBtn, nextBtn, confirmBtn, cancelBtn);

      // send initial message (use safeReply for slash)
      let sent;
      if (!isPrefix) {
        sent = await interaction.editReply({ embeds: [buildEmbed()], components: [row] }).catch(async () => {
          // fallback to followUp if editReply fails
          return interaction.followUp({ embeds: [buildEmbed()], components: [row], ephemeral: true }).catch(() => null);
        });
      } else {
        sent = await message.reply({ embeds: [buildEmbed()], components: [row] }).catch(() => null);
      }
      if (!sent) return; // couldn't send

      const collector = sent.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60_000,
      });

      collector.on("collect", async (btn) => {
        try {
          if (btn.user.id !== invokerId) return btn.reply({ content: "This is not your session.", ephemeral: true });

          // Prev / Next
          if (btn.customId === "inactive_prev") {
            page = Math.max(0, page - 1);
            const newRow = new ActionRowBuilder().addComponents(
              prevBtn.setDisabled(page === 0),
              nextBtn.setDisabled(page === totalPages - 1),
              confirmBtn,
              cancelBtn
            );
            await btn.update({ embeds: [buildEmbed()], components: [newRow] });
            return;
          }

          if (btn.customId === "inactive_next") {
            page = Math.min(totalPages - 1, page + 1);
            const newRow = new ActionRowBuilder().addComponents(
              prevBtn.setDisabled(page === 0),
              nextBtn.setDisabled(page === totalPages - 1),
              confirmBtn,
              cancelBtn
            );
            await btn.update({ embeds: [buildEmbed()], components: [newRow] });
            return;
          }

          // Cancel
          if (btn.customId === "inactive_cancel") {
            await btn.update({ content: "❌ Operation cancelled.", embeds: [], components: [] });
            collector.stop("cancelled");
            return;
          }

          // Confirm -> perform kicks (be careful)
          if (btn.customId === "inactive_confirm") {
            await btn.update({ content: `⏳ Removing ${membersArray.length} inactive members...`, embeds: [], components: [] }).catch(() => {});
            let removed = 0;
            for (const member of membersArray) {
              try {
                if (!member.kickable) continue;
                await member.kick(`Inactive for ${days} days`).catch(() => {});
                removed++;
              } catch (err) {
                console.error(`Failed to kick ${member.user.tag}:`, err);
              }
            }
            // report result
            const resultText = `✅ Removed ${removed}/${membersArray.length} inactive members (older than ${days} days).`;
            if (!isPrefix) {
              await interaction.followUp({ content: resultText, ephemeral: true }).catch(() => {});
            } else {
              await message.channel.send(resultText).catch(() => {});
            }
            collector.stop("done");
            return;
          }
        } catch (err) {
          console.error("Inactive collector error:", err);
          try { await btn.reply({ content: "⚠️ Something went wrong.", ephemeral: true }); } catch {}
        }
      });

      collector.on("end", async (collected, reason) => {
        if (reason === "time") {
          try {
            if (!isPrefix) await interaction.editReply({ content: "⌛ Timed out. No members were removed.", embeds: [], components: [] }).catch(() => {});
            else await sent.edit({ content: "⌛ Timed out. No members were removed.", embeds: [], components: [] }).catch(() => {});
          } catch {}
        }
      });
    } catch (err) {
      console.error("❌ Inactive command error:", err);
      return reply({ content: "⚠️ Something went wrong while running the command.", ephemeral: true });
    }
  },
};
