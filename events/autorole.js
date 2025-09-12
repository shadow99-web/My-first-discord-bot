
// events/autorole.js
module.exports = (client, getAutorole, saveAutorole) => {
    client.on("guildMemberAdd", async (member) => {
        try {
            const cfg = getAutorole();
            const guildCfg = cfg[member.guild.id];
            if (!guildCfg) return;

            const roleIds = member.user.bot ? (guildCfg.bots || []) : (guildCfg.humans || []);
            if (!Array.isArray(roleIds) || roleIds.length === 0) return;

            for (const roleId of roleIds) {
                const role = member.guild.roles.cache.get(roleId);
                if (!role) continue;
                try {
                    await member.roles.add(roleId, `Autorole: assigned on join`);
                } catch (err) {
                    console.warn(`Failed to add role ${roleId} to ${member.user.tag}:`, err.message);
                }
            }
        } catch (err) {
            console.error("Error in autorole handler:", err);
        }
    });
};
