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
    },
    {
        type: 3, //STRING
        name: 'track',
        description: 'which specific song',
        required: false
    }],
    async execute(client, db, interaction) {
        let username = interaction.options.getUser('user')?.username.toLowerCase();
        let track = interaction.options.getString('track', false) ?? '';

        if (username) {
            if (username === 'random') {
                username = '';
            }
            else if (username === interaction.user.username.toLowerCase() && !track.length) {
                username = 'congratulations';
            }
        }
        else {
            username = interaction.user.username.toLowerCase();
        }
        
        let base = false;
        if (track === '1') {
            track = '';
            base = true;
        }

        const path = username + track;

        if (!username.length || existsSync(`audio/friends/${path}.mp3`)) {
            const file = playMe(client, interaction.member.voice.channel, path, { base: base });
            interaction.reply(`You played: ${file}`);
        }
        else {
            interaction.reply({ content: 'Song not found; find a sound clip and give it to Bus!', ephemeral: true });
        }
    }
};