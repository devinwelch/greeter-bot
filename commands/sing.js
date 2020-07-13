const ytdl = require('ytdl-core');

module.exports = {
    name: 'sing',
    description: 'Play the first 10 seconds of a YouTube video in voice chat. Seeking too far slows this down.',
    category: 'sound',
    usage: '<youtube link> [start time (seconds)]',
    execute(client, config, db, message, args) {
        const voiceChannel = message.member.voice.channel;
        args = args.split(' ');
        const song = args[0];
        const streamOptions = { seek: args.length > 1 ? args[1] : 0, volume: 0.5 };

        if (voiceChannel && ytdl.validateURL(song) && (!voiceChannel.parent || voiceChannel.parent.id !== config.ids.foil)) {
            voiceChannel.join()
            .then(async function(connection) {
                const dispatcher = connection.play(ytdl(song), streamOptions);
                dispatcher.on('start', () => {
                    setTimeout(() => dispatcher.end(), 10000);
                });
                dispatcher.on('finish', () => {
                    voiceChannel.leave();
                });
            })
            .catch(console.error);
        }
        
        message.delete()
            .then(msg => console.log(`${msg.author.username} sang ${song}`))
            .catch(console.error);
    }
};