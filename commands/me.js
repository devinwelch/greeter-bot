const fs = require('fs');
const { playMe } = require('../utils.js');

module.exports = {
    name: 'me',
    description: 'Play a personalized greeting. If not set up, contact Bus.',
    usage: '[username]',
    execute(client, config, db, message, args) {
        const user = message.mentions.members.size
        ? message.mentions.members.first().user.username
        : args.length
            ? args.toLowerCase() === message.author.username.toLowerCase() 
                ? 'congratulations'
                : args.toLowerCase()
            : message.author.username.toLowerCase();
    
        if (fs.existsSync(`./Sounds/Friends/${user}.mp3`)) {
            playMe(client, message.member.voice.channel, user);
        }
        else {
            message.reply('Song not found; find a sound clip and give it to Bus!');
        }
    }
};