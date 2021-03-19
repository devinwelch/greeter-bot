const QuickChart = require('quickchart-js');
const { getData, getCoinData, updateData } = require('../utils');

/*TODO:
    max
    !buy
    update every minute, have each day as row in DB
*/ 

module.exports = {
    name: 'nannercoin',
    description: 'invest in Nannercoins using GBPs!',
    category: 'gbp',
    aliases: ['coin', 'bananacoin', 'gme'],
    usage: '[buy|sell <amount>] | [give <amount> @mention]',
    execute: async function(client, config, db, message, args) {
        if (args) {
            args = args.split(' ');
            const amount = Number.parseInt(args[1]);
            if (args.length > 1 && !isNaN(amount) && amount > 0) {
                if (args[0].toLowerCase() === 'buy') {
                    const coinData = await getCoinData(db);
                    const gbpData = await getGBPData(db, message.author.id);
                    const cost = coinData[coinData.length - 1] * amount;
                    if (coinData && gbpData && gbpData.GBPs >= cost) {
                        updateData(db, message.author, { gbps: -cost, coins: amount, message: message, emoji: '🪙' });
                    }
                }
                else if (args[0].toLowerCase() === 'sell') {
                    const coinData = await getCoinData(db);
                    const gbpData = await getGBPData(db, message.author.id);
                    const value = coinData[coinData.length - 1] * amount;
                    if (coinData && gbpData && value && gbpData.Coins >= amount) {
                        updateData(db, message.author, { gbps: value, coins: -amount, message: message, emoji: '🪙' });
                    }
                }
                else if (args[0].toLowerCase() === 'give') {
                    if (message.mentions.members.size) {
                        const recipient = message.mentions.members.first().user;
                        const gbpData = await getGBPData(db, message.author.id);
                        if (gbpData.Coins >= amount) {
                            updateData(db, message.author, { coins: -amount, message: message, emoji: '🪙' });
                            updateData(db, recipient, { coins: amount, message: message, emoji: config.ids.drops });
                        }
                    }
                    else {
                        message.reply('Please use the format: `!nannercoin give X @user`');
                    }
                }
            }
        }
        else {
            getChart(db, message);
        }
    }
};

async function getChart(db, message) {
    const coinData = await getCoinData(db);

    if (!coinData) {
        return message.reply('An error occured.');
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

    const gbpData = await getGBPData(db, message.author.id);
    if (gbpData) {
        text = `You have ${gbpData.Coins} Nannercoins worth ${gbpData.Coins * current} GBPs total.`;
    }

    message.reply(text, { files: [await chart.toBinary()] });
}

async function getGBPData(db, id) {
    const data = await getData(db, id);
    if (!data || !data.Responses || !data.Responses.GBPs || !data.Responses.GBPs.length) {
        return null;
    }

    return data.Responses.GBPs[0];
}
