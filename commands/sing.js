const ytdl = require('ytdl-core');

module.exports = {
    name: 'sing',
    description: 'Play the first 10 seconds of a YouTube video in voice chat. Seeking too far slows this down.',
    usage: '<youtube link> [start time (seconds)]',
    execute(client, config, db, message, args) {
        const voiceChannel = message.member.voice.channel;
        args = args.split(' ');
        const song = args[0];
        const streamOptions = { seek: args.length > 1 ? args[1] : 0, volume: 0.5 }; //TODO: seek and destroy

        if (message.member.voice.channel) {
            voiceChannel.join()
            .then(connection => {
                const stream = ytdl(song, { filter: 'audioonly' });
                const dispatcher = connection.play(stream, streamOptions);
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