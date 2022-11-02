import { playMe } from '../sound/playMe.js';
import { existsSync } from 'fs';

export default {
    name: 'me',
    description: 'Play a personalized greeting',
    category: 'sound',
    options: [{
        type: 6, //USER
        name: 'user',
        description: 'Name of user',
        required: false
    }],
    async execute(client, db, interaction) {
        let username = interaction.options.getUser('user')?.username.toLowerCase();

        if (username) {
            if (username === 'random') {
                username = '';
            }
            else if (username === interaction.user.username.toLowerCase()) {
                username = 'congratulations';
            }
        }
        else {
            username = interaction.user.username.toLowerCase();
        }
        
        if (!username.length || existsSync(`audio/friends/${username}.mp3`)) {
            const file = playMe(client, interaction.member.voice.channel, username);
            interaction.reply(`You played: ${file}`);
        }
        else {
            interaction.reply({ content: 'Song not found; find a sound clip and give it to Bus!', ephemeral: true });
        }
    }
};