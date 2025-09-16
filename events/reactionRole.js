const { Events } = require("discord.js");
const { getReactionRoles } = require("../Handlers/reactionRoleHandler");

module.exports = (client) => {
    // When someone adds a reaction
    client.on(Events.MessageReactionAdd, async (reaction, user) => {
        if (user.bot) return;

        // Make sure reaction + message is cached
        if (reaction.partial) await reaction.fetch();
        if (reaction.message.partial) await reaction.message.fetch();

        const guildId = reaction.message.guildId;
        const member = reaction.message.guild.members.cache.get(user.id);
        if (!member) return;

        // Get stored mappings
        const roles = await getReactionRoles(guildId);
        if (!roles) return;

        const emoji = reaction.emoji.id ? reaction.emoji.id : reaction.emoji.name;
        const roleId = roles[emoji];
        if (!roleId) return;

        // Add the role
        const role = reaction.message.guild.roles.cache.get(roleId);
        if (role) {
            try {
                await member.roles.add(role);
                console.log(`✅ Added ${role.name} to ${user.tag}`);
            } catch (err) {
                console.error("Failed to add reaction role:", err);
            }
        }
    });

    // When someone removes a reaction
    client.on(Events.MessageReactionRemove, async (reaction, user) => {
        if (user.bot) return;

        if (reaction.partial) await reaction.fetch();
        if (reaction.message.partial) await reaction.message.fetch();

        const guildId = reaction.message.guildId;
        const member = reaction.message.guild.members.cache.get(user.id);
        if (!member) return;

        const roles = await getReactionRoles(guildId);
        if (!roles) return;

        const emoji = reaction.emoji.id ? reaction.emoji.id : reaction.emoji.name;
        const roleId = roles[emoji];
        if (!roleId) return;

        const role = reaction.message.guild.roles.cache.get(roleId);
        if (role) {
            try {
                await member.roles.remove(role);
                console.log(`❌ Removed ${role.name} from ${user.tag}`);
            } catch (err) {
                console.error("Failed to remove reaction role:", err);
            }
        }
    });
};
