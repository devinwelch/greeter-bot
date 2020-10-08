const fs = require('fs');
const { playMe } = require('../utils.js');

module.exports = {
    name: 'me',
    description: 'Play a personalized greeting. If not set up, contact Bus.',
    category: 'sound',
    usage: '[username]',
    execute(client, config, db, message, args) {
        let username;

        if (args.length) {
            if (message.mentions.members.size) {
                username = message.mentions.members.first().user.username;
            }
            else if (args.toLowerCase() === 'random') {
                username = '';
            }
            else if (args.toLowerCase() === message.author.username.toLowerCase()) {
                username = 'congratulations';
            }
            else {
                username = args.toLowerCase();
            }
        }
        else {
            username = message.author.username.toLowerCase();
        }

        if (!username.length || fs.existsSync(`./Sounds/Friends/${username}.mp3`)) {
            playMe(client, message.member.voice.channel, username);
        }
        else {
            message.reply('Song not found; find a sound clip and give it to Bus!');
        }
    }
};