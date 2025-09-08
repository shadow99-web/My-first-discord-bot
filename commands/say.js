const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "say",
  description: "Make the bot say something in an embedded message",
  
  data: new SlashCommandBuilder()
    .setName("say")
    .setDescription("Bot will repeat your message in an embed")
    .addStringOption(option => 
      option.setName("message")
        .setDescription("Message you want the bot to say")
        .setRequired(true)
    ),

  async execute({ interaction, message, args, isPrefix }) {
    const blueHeart = "<a:blue_heart_1414309560231002194:1414309560231002194>";
    let content;

    if (isPrefix && args) {
      content = args.join(" ");
      if (!content) return message.reply("❌ You need to provide a message!");
    } else if (interaction) {
      content = interaction.options.getString("message");
    }

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setDescription(`${blueHeart} ${content}`)
      .setTimestamp();

    try {
      if (isPrefix) {
        await message.channel.send({ embeds: [embed] });
      } else if (interaction) {
        if (!interaction.deferred && !interaction.replied) await interaction.deferReply();
        await interaction.followUp({ embeds: [embed] });
      }
    } catch (err) {
      console.error("❌ Error sending say embed:", err);
      if (interaction) {
        interaction.followUp({ content: "❌ Failed to send message.", ephemeral: true }).catch(() => {});
      } else if (isPrefix) {
        message.reply("❌ Failed to send message.").catch(() => {});
      }
    }
  }
};
