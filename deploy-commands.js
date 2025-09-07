require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID; // Bot's Application ID
const guildId = process.env.GUILD_ID;   // Your test server ID

// Load commands
const commands = [];
const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command?.data?.toJSON) {
        commands.push(command.data.toJSON());
    }
}

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
    try {
        console.log(`⚡ Started refreshing ${commands.length} commands...`);

        // --- GUILD SPECIFIC (instant) ---
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
        console.log("✅ Successfully registered commands to the guild (instant)");

        // --- GLOBAL (may take up to 1 hour) ---
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log("🌐 Successfully registered commands globally (may take up to 1 hour)");

    } catch (error) {
        console.error(error);
    }
})();
