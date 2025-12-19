const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
  addResponse,
  removeResponse,
  listResponses,
} = require("../Handlers/autoresponseHandler");

module.exports = {
  name: "autoresponse",

  data: new SlashCommandBuilder()
    .setName("autoresponse")
    .setDescription("Manage autoresponses")
    .addSubcommand(sub =>
      sub
        .setName("add")
        .setDescription("Add an autoresponse")
        .addStringOption(opt =>
          opt.setName("trigger").setDescription("Trigger").setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName("response").setDescription("Response text")
        )
        .addAttachmentOption(opt =>
          opt.setName("file").setDescription("Optional attachment")
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("remove")
        .setDescription("Remove an autoresponse")
        .addStringOption(opt =>
          opt.setName("trigger").setDescription("Trigger").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("list").setDescription("List autoresponses")
    ),

  async execute({ interaction, message, args, isPrefix }) {
    const guildId = interaction?.guildId || message?.guild?.id;
    const user = interaction?.user || message?.author;

    if (!guildId) return;

    // ---------- SAFE REPLY ----------
    const reply = async (payload) => {
      if (interaction) {
        if (interaction.replied || interaction.deferred) {
          return interaction.followUp({ ...payload, ephemeral: true }).catch(() => {});
        }
        return interaction.reply({ ...payload, ephemeral: true }).catch(() => {});
      }

      if (message) {
        return message.reply(payload).catch(() => {});
      }
    };

    // ---------- PARSE INPUT ----------
    let sub, trigger, response, file;

    if (interaction) {
      sub = interaction.options.getSubcommand();
      trigger = interaction.options.getString("trigger");
      response = interaction.options.getString("response");
      file = interaction.options.getAttachment("file");
    } else {
      // autoresponse add hello hi there
      sub = args?.shift()?.toLowerCase();
      trigger = args?.shift();
      response = args?.join(" ");
      if (message.attachments.size) file = message.attachments.first();
    }

    // ---------- ADD ----------
    if (sub === "add") {
      if (!trigger) return reply({ content: "❌ Trigger required." });
      if (!response && !file)
        return reply({ content: "❌ Provide response text or attachment." });

      const entry = response || file.url;
      await addResponse(guildId, trigger, entry, user.tag);

      return reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setTitle("✅ Autoresponse Added")
            .setDescription(
              `**Trigger:** \`${trigger}\`\n**Response:** ${
                response || `[Attachment](${file.url})`
              }`
            )
            .setFooter({ text: `Added by ${user.tag}` }),
        ],
      });
    }

    // ---------- REMOVE ----------
    if (sub === "remove") {
      if (!trigger) return reply({ content: "❌ Trigger required." });

      const ok = await removeResponse(guildId, trigger);
      return reply({
        content: ok
          ? `✅ Removed autoresponse for \`${trigger}\``
          : "❌ Trigger not found.",
      });
    }

    // ---------- LIST ----------
    if (sub === "list") {
      const docs = await listResponses(guildId);
      if (!docs.length)
        return reply({ content: "✨ No autoresponses set." });

      const desc = docs
        .map(d => `🔹 **${d.trigger}**\n${d.responses.join("\n")}`)
        .join("\n\n");

      return reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Blue")
            .setTitle(" __Autoresponses__")
            .setDescription(desc),
        ],
      });
    }

    return reply({ content: "❌ Invalid subcommand." });
  },
};
