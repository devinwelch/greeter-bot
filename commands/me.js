const fs = require('fs');
const { playMe } = require('../utils.js');

module.exports = {
    name: 'me',
    description: 'Play a personalized greeting. If not set up, contact Bus.',
    usage: '[username]',
    execute(client, config, db, message, args) {
        args = args.toLowerCase();
        const user = args.length
            ? args === message.author.username.toLowerCase() 
                ? 'congratulations'
                : args 
            : message.author.username;
    
        if (fs.existsSync(`./Sounds/Friends/${user}1.mp3`)) {
            playMe(client, message.member.voice.channel, user);
        }
        else {
            message.reply('Username not found; find a sound clip and give it to Bus!');
        }
    }
};