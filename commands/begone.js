module.exports = {
    name: 'begone',
    description: 'Kick greeter-bot out of the voice channel.',
    category: 'sound',
    aliases: ['begonebot'],
    execute(client, config, db, message, args) {
        const channel = message.guild.me.voice.channel;
        if (channel) {   
            channel.leave();
        }
    }
};