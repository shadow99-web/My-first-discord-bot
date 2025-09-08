// Boosts info
const boostersList = guild.members.cache
    .filter(m => m.premiumSince)
    .map(m => `<a:blue_heart:1414309560231002194> <@${m.id}>`)
    .join("\n") || "No one boosted this guild";

embed.addFields(
    { name: '__Total Boosts__', value: `${heart} ${totalBoosts}`, inline: true },
    { name: '__Boost Level__', value: `${heart} ${boostLevel}`, inline: true },
    { name: '__Boosters__', value: boostersList, inline: false }
);
