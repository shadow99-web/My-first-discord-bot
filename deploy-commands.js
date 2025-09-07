const { REST, Routes } = require("discord.js");
require("dotenv").config();
const fs = require("fs");

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; // your testing guild ID
const TOKEN = process.env.TOKEN;

const commands = [];
const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command.data) commands.push(command.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
    try {
        console.log(`🚀 Registering ${commands.length} commands to GUILD (${GUILD_ID})...`);
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), // Guild registration (instant)
            { body: commands }
        );
        console.log("✅ Guild commands registered successfully!");

        console.log(`🚀 Registering ${commands.length} commands globally...`);
        await rest.put(
            Routes.applicationCommands(CLIENT_ID), // Global registration
            { body: commands }
        );
        console.log("✅ Global commands registered successfully! (may take up to 1 hour to appear)");
    } catch (error) {
        console.error(error);
    }
})();
