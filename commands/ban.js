const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "ban",
  description: "Ban a member by mention, username, or ID",
  // Slash command setup
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member")
    .addStringOption(option => 
      option.setName("user")
        .setDescription("User ID or mention")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("reason")
        .setDescription("Reason for the ban")
        .setRequired(false)),
  async execute(interaction, client) {
    const userInput = interaction.options.getString("user");
    const reason = interaction.options.getString("reason") || "No reason provided";

    let member;
    try {
      // Try fetching by ID
      member = await interaction.guild.members.fetch(userInput).catch(() => null);
      // If not found by ID, try mention/username
      if (!member) {
        const userMention = userInput.replace(/[<@!>]/g, "");
        member = await interaction.guild.members.fetch(userMention).catch(() => null);
      }
    } catch {}
    
    if (!member) return interaction.reply({ content: "User not found.", ephemeral: true });

    if (!member.bannable) return interaction.reply({ content: "I cannot ban this user.", ephemeral: true });

    await member.ban({ reason });

    const embed = new EmbedBuilder()
      .setTitle("Member Banned")
      .setDescription(`💙 **${member.user.tag}** has been banned!\n**Reason:** ${reason}`)
      .setColor("Blue")
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
};

// ====== PREFIX COMMAND ======
module.exports.prefix = async (message, args) => {
  if (!message.member.permissions.has("BanMembers")) return message.reply("You cannot use this command!");
  if (!args[0]) return message.reply("Please provide a user ID or mention.");
  
  let member;
  try {
    member = await message.guild.members.fetch(args[0]).catch(() => null);
    if (!member && args[0].match(/^<@!?(\d+)>$/)) {
      const id = args[0].replace(/[<@!>]/g, "");
      member = await message.guild.members.fetch(id).catch(() => null);
    }
  } catch {}
  
  if (!member) return message.reply("User not found.");
  if (!member.bannable) return message.reply("I cannot ban this user.");

  const reason = args.slice(1).join(" ") || "No reason provided";
  await member.ban({ reason });

  const embed = new EmbedBuilder()
    .setTitle("Member Banned")
    .setDescription(`💙 **${member.user.tag}** has been banned!\n**Reason:** ${reason}`)
    .setColor("Blue")
    .setTimestamp();

  message.channel.send({ embeds: [embed] });
};
