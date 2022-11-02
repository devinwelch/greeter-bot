//TODO
// TypeError: Cannot read properties of undefined (reading 'id')
//     at play (file:///d:/Users/Devin/Source/Discord/greeter-bot/src/sound/play.js:24:64)
//     at playFile (file:///d:/Users/Devin/Source/Discord/greeter-bot/src/sound/playFile.js:10:5)
//     at spook (file:///d:/Users/Devin/Source/Discord/greeter-bot/src/scheduling/spook.js:17:5) 

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