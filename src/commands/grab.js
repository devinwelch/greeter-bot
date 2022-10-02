import { getData } from '../data/getData.js';
import { updateData } from '../data/updateData.js';
import { databaseError } from '../utils/databaseError.js';

export default {
    name: 'grab',
    description: 'Grab stashed-away GBPs',
    category: 'gbp',
    options: [{
        type: 4, //INTEGER
        name: 'amount',
        description: 'How many GBPs to grab',
        required: true
    }],
    async execute(client, db, interaction) {
        const amount = interaction.options.getInteger('amount');

        if (amount <= 0) {
            return interaction.reply('Why would you try that?');
        }

        const data = await getData(db, interaction.user.id);
        if (!data) {
            return databaseError(interaction, 'gbp');
        }

        if (data.Stash < amount) {
            return interaction.reply(`Hold on, cowboy, you only have ${data.Stash} GBPs stashed away!`);
        }
        else {
            updateData(db, interaction.user, { gbps: amount, stash: -amount });
            await interaction.reply({ content: client.emojis.resolve(client.ids.emojis.drops).toString() });
        }
    }
};