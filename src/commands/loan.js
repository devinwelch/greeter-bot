import { getData } from '../data/getData.js';
import { updateData } from '../data/updateData.js';
import { getNetWorth } from '../gbp/getNetWorth.js';
import { getCoinData } from '../data/getCoinData.js';
import { databaseError } from '../utils/databaseError.js';
import { MessageActionRow, MessageButton } from 'discord.js';

export default {
    name: 'loan',
    description: 'Take out a loan. Be careful, greeter-bot is a shark that will get his cut!',
    options: [{
        type: 1, //SUB_COMMAND
        name: 'pay',
        description: 'Pay off your loan early'
    },
    {
        type: 1, //SUB_COMMAND
        name: 'borrow',
        description: 'Take out a loan',
        options: [{
            type: 4, //INTEGER
            name: 'amount',
            description: 'Loan amount',
            required: false
        }]
    }],
    category: 'gbp',
    async execute(client, db, interaction) {
        const subcommand = interaction.options.getSubcommand();

        //user wants to pay off loan
        if (subcommand === 'pay') {
            const data = await getData(db, interaction.user.id);
            if (!data) {
                return databaseError(interaction, 'gbp');
            }

            if (!data.Loan) {
                //user doesn't have loan
                interaction.reply("You don't owe anything!");
            }
            else {
                
                //user cannot afford to pay back yet
                if (data.GBPs < data.Loan) {
                    interaction.reply(`You don't have enough yet! Come back with ${data.Loan} GBPs or I'll take it myself.`);
                }
                //pay back loan
                else {
                    updateData(db, interaction.user, { gbps: -data.Loan, loan: 0 });
                    updateData(db, client.user, { gbps: data.Loan });
                    interaction.reply('Thank you, come again!');
                }
            }
        }

        //user wants to take out a loan
        else {
            const amount = interaction.options.getInteger('amount');
            if (amount && amount < 1) {
                return interaction.reply('I oughtta break your legs for that one.');
            }

            const data = await getData(db, interaction.user.id);
            if (!data) {
                return databaseError(interaction, 'gbp');
            }

            if (amount) {
                //user already has loan
                if (data.Loan) {
                    interaction.reply(`You already have a loan for ${data.Loan}`);
                }
                //user asked for too much
                else if (amount > await getMaxLoan(db, data)) {
                    interaction.reply('Denied. Prove your worth before you try to borrow that much.');
                }
                //give a loan
                else {
                    giveLoan(client, db, interaction, amount);
                }
            }
            else {
                //user has 0 loan
                if (!data.Loan) {
                    const maxLoan = [new MessageActionRow().addComponents([
                        new MessageButton()
                            .setLabel('Max Loan!!!')
                            .setEmoji(client.ids.emojis.drops)
                            .setStyle('DANGER')
                            .setCustomId('max')
                    ])];
                    const max = await getMaxLoan(db, data);
                    await interaction.reply({ content: `I can lend you up to ${max.toLocaleString('en-US')} GBPs.`, components: maxLoan });

                    wait(client, db, interaction, max);
                }
                //threaten to collect on loan
                else {
                    interaction.reply(`You have a loan out for ${data.Loan.toLocaleString('en-US')} GBPs. I will collect ${data.Loan} tonight...`);
                }
            }
        }
    }
};

async function getMaxLoan(db, data) {
    //get coin value but don't fail if data isn't found
    let coinData = await getCoinData(db);
    coinData = coinData ? coinData[coinData.length - 1] : 0;

    //Average of current GBPs and (highest achieved GBPs or half of 1 NNC)
    const netWorth = await getNetWorth(db, data);
    const credit = Math.max(data.HighScore, coinData / 2);

    return Math.max(Math.ceil((credit + netWorth) / 2), 0);
}

async function wait(client, db, interaction, max) {
    interaction.message = await interaction.fetchReply();
    const filter = buttonInteraction => buttonInteraction.message === interaction.message && buttonInteraction.user === interaction.user;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', buttonInteraction => {
        if (buttonInteraction.customId === 'max') {
            const choice = [new MessageActionRow().addComponents(
                [
                new MessageButton()
                    .setLabel('No')
                    .setEmoji(client.ids.emojis.baba)
                    .setStyle('SECONDARY')
                    .setCustomId('no'),
                new MessageButton()
                    .setLabel('Yes')
                    .setEmoji(client.ids.emojis.yeehaw)
                    .setStyle('PRIMARY')
                    .setCustomId('yes')
                ]
            )];

            buttonInteraction.update({ content: 'Are you sure?', components: choice });
        }
        else if (buttonInteraction.customId === 'yes') {
            giveLoan(client, db, buttonInteraction, max, true);
        }
        else if (buttonInteraction.customId === 'no') {
            buttonInteraction.update({ content: 'Right proper lad', components: [] });
        }
    });
}

function giveLoan(client, db, interaction, amount, update=false) {
    //interest = 10%
    const total = Math.ceil(amount * 1.1);

    updateData(db, interaction.user, { gbps: amount, loan: total });
    updateData(db, client.user, { gbps: -amount });
    const parameters = { content: `Done, here's your loan for ${amount.toLocaleString('en-US')} GBPs, but you better have my money by midnight...`, components: [] };
    update ? interaction.update(parameters) : interaction.reply(parameters);
}