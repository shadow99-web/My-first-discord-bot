const { Events } = require("discord.js");
const { getReactionRoles } = require("../Handlers/reactionRoleHandler");

module.exports = (client) => {
    // Reaction Added
    client.on(Events.MessageReactionAdd, async (reaction, user) => {
        if (user.bot) return;

        try {
            // Handle partials
            if (reaction.partial) await reaction.fetch();
            if (reaction.message.partial) await reaction.message.fetch();

            const guild = reaction.message.guild;
            if (!guild) return;

            // Fetch member safely
            const member = await guild.members.fetch(user.id).catch(() => null);
            if (!member) return;

            // Get roles from DB
            const roles = await getReactionRoles(guild.id, reaction.message.id);
            const emojiKey = reaction.emoji.id || reaction.emoji.name;
            const roleId = roles[emojiKey];
            if (!roleId) return;

            const role = guild.roles.cache.get(roleId);
            if (!role) return;

            await member.roles.add(role);
            console.log(`✅ Added ${role.name} to ${user.tag}`);
        } catch (err) {
            console.error("❌ Error in MessageReactionAdd handler:", err);
        }
    });

    // Reaction Removed
    client.on(Events.MessageReactionRemove, async (reaction, user) => {
        if (user.bot) return;

        try {
            // Handle partials
            if (reaction.partial) await reaction.fetch();
            if (reaction.message.partial) await reaction.message.fetch();

            const guild = reaction.message.guild;
            if (!guild) return;

            // Fetch member safely
            const member = await guild.members.fetch(user.id).catch(() => null);
            if (!member) return;

            // Get roles from DB
            const roles = await getReactionRoles(guild.id, reaction.message.id);
            const emojiKey = reaction.emoji.id || reaction.emoji.name;
            const roleId = roles[emojiKey];
            if (!roleId) return;

            const role = guild.roles.cache.get(roleId);
            if (!role) return;

            await member.roles.remove(role);
            console.log(`❌ Removed ${role.name} from ${user.tag}`);
        } catch (err) {
            console.error("❌ Error in MessageReactionRemove handler:", err);
        }
    });
};
