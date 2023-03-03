import { getData } from '../data/getData.js';
import { updateData } from '../data/updateData.js';
import { databaseError } from '../utils/databaseError.js';

export default {
    name: 'give',
    description: 'Donate GBPs to a user. Pls no schemes',
    category: 'gbp',
    options: [{
        type: 6, //USER
        name: 'user',
        description: 'Donation recipient',
        required: true
    },
    {
        type: 4, //INTEGER
        name: 'amount',
        description: 'How many GBPs to give',
        required: true
    }],
    async execute(client, db, interaction) {
        const recipient = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        if (recipient === interaction.user) {
            return interaction.reply("I'm pretty sure that's fraud.");
        }
        else if (amount <= 0) {
            return interaction.reply('Why would you try that?');
        }

        const data = await getData(db, interaction.user.id);
        if (!data) {
            return databaseError(interaction, 'gbp');
        }

        if (data.GBPs < amount) {
            return interaction.reply(`Whoa there, tiger! You only have ${data.GBPs} GBPs!`);
        }
        else {
            updateData(db, interaction.user, { gbps: -amount });
            updateData(db, recipient, { gbps: amount });
            interaction.reply(`${interaction.user.username} gave ${amount} GBPs to ${recipient}. A kind soul; bless you.`);
        }
    }
};