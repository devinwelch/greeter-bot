const { playSong, updateGBPs } = require('../utils.js');

module.exports = {
    name: 'exposed',
    description: 'Play a beautiful serenade in the voice channel! Careful of your GBPs!',
    execute(client, config, db, message, args) {
        playSong(client, message.member.voice.channel, 'Exposed.mp3');
        updateGBPs(db, message.author, -5);
    }
};