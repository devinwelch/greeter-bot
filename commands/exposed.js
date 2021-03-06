const { playSong, updateData } = require('../utils.js');

module.exports = {
    name: 'exposed',
    description: 'Play a beautiful serenade in the voice channel! Careful of your GBPs!',
    category: 'sound',
    execute(client, config, db, message, args) {
        playSong(client, message.member.voice.channel, 'Exposed.mp3');
        updateData(db, message.author, { gbps: -5 });
    }
};