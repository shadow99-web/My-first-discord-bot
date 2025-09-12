// events/autorole.js
module.exports = (client, getAutorole) => {
    client.on("guildMemberAdd", async (member) => {
        try {
            const cfg = getAutorole();
            if (!cfg || typeof cfg !== "object") return;

            const guildCfg = cfg[member.guild.id];
            if (!guildCfg) return;

            // Pick correct roles (bots/humans)
            const roleIds = member.user.bot ? guildCfg.bots || [] : guildCfg.humans || [];
            if (!Array.isArray(roleIds) || roleIds.length === 0) return;

            for (const roleId of roleIds) {
                const role = member.guild.roles.cache.get(roleId);
                if (!role) {
                    console.warn(`⚠️ Autorole: Role ID ${roleId} not found in guild ${member.guild.name}`);
                    continue;
                }

                try {
                    await member.roles.add(roleId, "Autorole: assigned on join");
                    console.log(`✅ Autorole: Added ${role.name} to ${member.user.tag}`);
                } catch (err) {
                    console.warn(`❌ Failed to add role ${roleId} to ${member.user.tag}:`, err.message);
                }
            }
        } catch (err) {
            console.error("❌ Error in autorole handler:", err);
        }
    });
};
