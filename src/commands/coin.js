import { getData } from '../data/getData.js';
import { updateData } from '../data/updateData.js';
import { getCoinData } from '../data/getCoinData.js';
import { databaseError } from '../utils/databaseError.js';

export default {
    name: 'coin',
    description: 'Invest in Nannercoins using GBPs',
    category: 'gbp',
    options: [
    {
        type: 2, //SUB_COMMAND_GROUP
        name: 'buy',
        description: 'Buy some NNC',
        options: [
            {
                type: 1, //SUB_COMMAND
                name: 'max',
                description: 'Buy as many NNC as possible'
            },
            {
                type: 1, //SUB_COMMAND
                name: 'amount',
                description: 'Buy a specific amount of NNC',
                options: [{
                    type: 4, //INTEGER
                    name: 'amount',
                    description: 'How many?',
                    required: true
                }]
            }
        ]
    },
    {
        type: 2, //SUB_COMMAND_GROUP
        name: 'sell',
        description: 'Sell your NNC',
        options: [
            {
                type: 1, //SUB_COMMAND
                name: 'max',
                description: 'Sell as many NNC as possible'
            },
            {
                type: 1, //SUB_COMMAND
                name: 'amount',
                description: 'Sell a specific amount of NNC',
                options: [{
                    type: 4, //INTEGER
                    name: 'amount',
                    description: 'How many?',
                    required: true
                }]
            }
        ]
    },
    {
        type: 1, //SUB_COMMAND
        name: 'give',
        description: 'Give away your NNC',
        options: [{
            type: 4, //INTEGER
            name: 'amount',
            description: 'Amount of NNC',
            required: true
        },
        {
            type: 6, //USER
            name: 'user',
            description: 'Receiving user',
            required: true
        }],
    }],
    async execute(client, db, interaction) {
        let coinData = await getCoinData(db);
        if (!coinData) {
            return databaseError(interaction, 'coin');
        }

        let gbpData = await getData(db, interaction.user.id);
        if (!gbpData) {
            return databaseError(interaction, 'gbp');
        }

        const subcommandGroup = interaction.options.getSubcommandGroup(false);
        const amount = interaction.options.getInteger('amount', false);

        if (subcommandGroup) {
            const coinValue = coinData[coinData.length - 1];

            //buy
            if (subcommandGroup === 'buy') {
                buy(client, db, interaction, coinValue, gbpData, amount);
            }
            //sell
            else {
                sell(client, db, interaction, coinValue, gbpData, amount);
            }
        }
        //give
        else {
            give(db, interaction, gbpData, amount);
        }
    }
};

async function buy(client, db, interaction, coinValue, gbpData, amount) {
    //max
    if (!amount) {
        amount = Math.floor(gbpData.GBPs / coinValue);
    }

    const cost = coinValue * amount;
    if (gbpData.GBPs >= cost && amount > 0) {
        updateData(db, interaction.user, { gbps: -cost, coins: amount });
        updateData(db, client.user, { gbps: cost });
        interaction.reply(`You purchased ${amount} NNC for ${cost.toLocaleString('en-US')} GBP 🪙`);
    }
    else {
        reject(interaction);
    }
}

async function sell(client, db, interaction, coinValue, gbpData, amount) {
    //max
    if (!amount) {
        amount = gbpData.Coins;
    }

    const value = coinValue * amount;
    if (gbpData.Coins >= amount && amount > 0) {
        updateData(db, interaction.user, { gbps: value, coins: -amount });
        updateData(db, client.user, { gbps: -value });
        interaction.reply(`You sold ${amount} NNC for ${value.toLocaleString('en-US')} GBP 🪙`);
    }
    else {
        reject(interaction);
    }
}

async function give(db, interaction, gbpData, amount) {
    const recipient = interaction.options.getUser('user');

    if (interaction.user === recipient || amount < 1) {
        interaction.reply('Fuck off, silly bitch.');
    }
    else if (gbpData.Coins >= amount) {
        updateData(db, interaction.user, { coins: -amount });
        updateData(db, recipient, { coins: amount });
        interaction.reply(`${interaction.user.username} gave ${amount} NNC to ${recipient}. Kind and generous, true royalty!`);
    }
    else {
        reject(interaction);
    }
}

function reject(interaction) {
    return interaction.reply('No deal.');
}
