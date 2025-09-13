// Events/guildMemberAdd.js
const { load } = require("../Handlers/greetHandler");

module.exports = {
    name: "guildMemberAdd",
    async execute(member) {
        const db = load();
        const guildId = member.guild.id;
        const greets = db[guildId] || [];

        if (greets.length === 0) return;

        // pick random greet
        const greet = greets[Math.floor(Math.random() * greets.length)];

        let text = greet.text || "";
        text = text
            .replace(/{user}/g, `${member}`)
            .replace(/{server}/g, member.guild.name)
            .replace(/{count}/g, member.guild.memberCount);

        try {
            await member.guild.systemChannel?.send({
                content: text,
                files: greet.attachment ? [greet.attachment] : []
            });
        } catch (e) {
            console.error("Failed to send greet:", e);
        }
    }
};
