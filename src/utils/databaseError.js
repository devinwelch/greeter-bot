/**
 * Ends an interaction if data fails to load
 * @returns void
 */

export function databaseError(interaction, str) {
    const error = `Failed to load ${str} data. Maybe tell Bus?`;
    const params = { content: error, ephemeral: true };

    interaction.replied ? interaction.editReply(params) : interaction.reply(params);
    console.error(error);
}