/**
 * returns voice channel with most amount of users
 * @returns VoiceChannel
 */

export async function getPopularChannel(client) {
    return client.channels.cache
        .filter(channel => channel.type === 'GUILD_VOICE')
        .filter(channel => !channel.parent || channel.parent.id !== client.ids.foil)
        .sort(function (channel1, channel2) { return channel2.members.size - channel1.members.size; })
        .first();
}