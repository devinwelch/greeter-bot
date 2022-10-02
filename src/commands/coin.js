import QuickChart from 'quickchart-js';
import { getData } from '../data/getData.js';
import { updateData } from '../data/updateData.js';
import { getCoinData } from '../data/getCoinData.js';
import { databaseError } from '../utils/databaseError.js';

export default {
    name: 'coin',
    description: 'Invest in Nannercoins using GBPs',
    category: 'gbp',
    options: [{
        type: 1, //SUB_COMMAND
        name: 'graph',
        description: 'See how NNC is doing'
    },
    {
        type: 1, //SUB_COMMAND
        name: 'buy',
        description: 'Buy some NNC',
        options: [{
            type: 4, //INTEGER
            name: 'amount',
            description: 'Amount of NNC',
            required: true
        }],
    },
    {
        type: 1, //SUB_COMMAND
        name: 'sell',
        description: 'Sell some NNC',
        options: [{
            type: 4, //INTEGER
            name: 'amount',
            description: 'Amount of NNC',
            required: true
        }],
    },
    {
        type: 1, //SUB_COMMAND
        name: 'give',
        description: 'Give away some NNC',
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

        const amount = interaction.options.getInteger('amount');
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'graph':
                graph(interaction, coinData, gbpData, amount);
                break;
            case 'buy':
                buy(client, db, interaction, coinData, gbpData, amount);
                break;
            case 'sell':
                sell(client, db, interaction, coinData, gbpData, amount);
                break;
            case 'give':
                give(db, interaction, gbpData);
                break;
        }
    }
};

async function graph(interaction, coinData, gbpData) {
    if (coinData.length > 7 * 24) {
        coinData = coinData.slice(-7 * 24);
    }

    const current = coinData[coinData.length - 1];
    const referenceLine = [...coinData].fill(coinData[Math.max(0, coinData.length - 24)]);
    const color = current > referenceLine[0]
        ? 'rgb(69, 255, 69)'
        : 'rgb(255, 69, 69)';

    const chart = new QuickChart();
    chart.setConfig({ 
        type: 'line',
        data: {
            labels: coinData,
            datasets: [
                {
                    data: coinData,
                    borderColor: color,
                    fill: false,
                    lineTension: 0.1,
                    pointRadius: 0
                },
                {
                    data: referenceLine,
                    borderColor: 'rgb(255, 255, 255)',
                    fill: false,
                    borderDash: [5, 5],
                    pointRadius: 0
                }
            ]
        },
        options: {
            legend: {
                display: false
            },
            title: {
                display: true,
                text: `1 Nannercoin = ${current} GBPs`,
                fontColor: color,
                fontSize: 20
            },
            scales: {
                xAxes: [{ display: false }],
                yAxes: [{ display: false }]
            }
        }
    })
    .setBackgroundColor('transparent');

    let text;
    if (gbpData) {
        text = `You have ${gbpData.Coins} Nannercoins worth ${gbpData.Coins * current} GBPs total`;
    }

    interaction.reply({ content: text, files: [await chart.toBinary()] });
}

async function buy(client, db, interaction, coinData, gbpData, amount) {
    const cost = coinData[coinData.length - 1] * amount;
    if (gbpData.GBPs >= cost && amount > 0) {
        updateData(db, interaction.user, { gbps: -cost, coins: amount });
        updateData(db, client.user, { gbps: cost });
        interaction.reply('🪙');
    }
    else {
        reject(interaction);
    }
}

async function sell(client, db, interaction, coinData, gbpData, amount) {
    const value = coinData[coinData.length - 1] * amount;
    if (gbpData.Coins >= amount && amount > 0) {
        updateData(db, interaction.user, { gbps: value, coins: -amount });
        updateData(db, client.user, { gbps: -value });
        interaction.reply('🪙');
    }
    else {
        reject(interaction);
    }
}

async function give(db, interaction, gbpData, amount) {
    const recipient = interaction.options.getUser('user');

    if (interaction.user === recipient) {
        interaction.reply('Fuck off, silly bitch.');
    }
    else if (gbpData.Coins >= amount) {
        updateData(db, interaction.user, { coins: -amount });
        updateData(db, recipient, { coins: -amount });
        interaction.reply('Kind and generous, true royalty!');
    }
    else {
        reject(interaction);
    }
}

function reject(interaction) {
    return interaction.reply('No deal.');
}