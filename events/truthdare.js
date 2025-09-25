const { handleTruthDare } = require("../Handlers/truthdareHandler");

module.exports = (client) => {
    client.on("interactionCreate", async (interaction) => {
        if (!interaction.isButton()) return;

        // Only handle truth-dare buttons here
        if (["td_truth", "td_dare", "td_random"].includes(interaction.customId)) {
            await handleTruthDare(interaction);
        }
    });
};
