const { SlashCommandBuilder } = require("discord.js");
const { listGreets } = require("../Handlers/greetHandler");

module.exports = {
  name: "greettest",
  description: "Preview a random greeting message as if a user joined",
  data: new SlashCommandBuilder()
    .setName("greettest")
    .setDescription("Test a random greeting message"),

  async execute({ interaction, message }) {
    const guild = interaction?.guild || message.guild;
    const user = interaction?.user || message.author;
    const guildId = guild.id;

    const reply = async (content) => {
      if (!content) return;
      if (interaction) return interaction.reply(content);
      if (message) return message.reply(content);
    };

    const greets = listGreets(guildId);
    if (!greets.length) {
      return reply("✨ No greeting messages set for this server!");
    }

    // Pick random greet
    const greet = greets[Math.floor(Math.random() * greets.length)];
    const text = greet.text
      .replace(/{user}/g, `<@${user.id}>`)
      .replace(/{server}/g, guild.name)
      .replace(/{count}/g, guild.memberCount);

    return reply({
      content: text,
      files: greet.attachment ? [greet.attachment] : []
    });
  }
};
