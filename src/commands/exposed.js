import { playFile } from '../sound/playFile.js';
import { updateData } from '../data/updateData.js';

export default {
    name: 'exposed',
    description: 'Expose the lies and shame',
    category: 'sound',
    async execute(client, db, interaction) {
        playFile(client, interaction.member.voice.channel, 'other/exposed.mp3');
        interaction.reply({ content: 'Shame... -5 GBPs.', ephemeral: true });
        console.log(`${interaction.user.username} exposed themself!`);
        updateData(db, interaction.user, { gbps: -5 });
    }
};