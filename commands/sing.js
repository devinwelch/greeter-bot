const { playYouTube } = require('../utils');
const ytdl = require('ytdl-core');

const self = module.exports = {
    name: 'sing',
    description: 'Play the first 10 seconds of a YouTube video in voice chat. Seeking too far slows this down.',
    category: 'sound',
    usage: '<youtube link> [start time (seconds)]'
};

self.execute = async function(client, config, db, message, args) {
    args = args.split(' ');
    playYouTube(client, message.member.voice.channel, args[0], { seek: args.length > 1 ? args[1] : 0, timeout: 10000 });
    
    const info = await ytdl.getBasicInfo(args[0]);
    message.delete()
        .then(msg => console.log(`${msg.author.username} sang ${info.videoDetails.title} (${info.videoDetails.video_url})`))
        .catch(console.error);
};