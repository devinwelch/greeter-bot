import QuickChart from 'quickchart-js';
import { commify } from '../utils/commify.js';
import { getCoinData } from '../data/getCoinData.js';
import { updateData } from '../data/updateData.js';
import { getNetWorth } from '../gbp/getNetWorth.js';
import { getRandom } from '../utils/random.js';

/**
 * increments value of nannercoin
 * @param client 
 * @param db 
 */

export async function stonks(client, db) {
    //get coin values array
    const data = await getCoinData(db);
    if (!data) {
        return;
    }

    //manipulate current coin value
    const current = data[data.length - 1];
    const iterations = 3, divider = 3;
    let delta = 0;
    for (let i = 0; i < iterations; i++) {
        delta += getRandom(-19 * divider, 20 * divider);
    }
    delta = 1 + delta / divider / iterations / 100;
    data.push(Math.floor(current * delta));

    //slice array to keep db small
    const newValues = data.slice(Math.max(0, data.length - 50));
    const params = {
        TableName: 'Coin',
        Key: { Key: 0 },
        UpdateExpression: 'set #v = :d',
        ExpressionAttributeNames: { '#v': 'Values' },
        ExpressionAttributeValues: { ':d': newValues }
    };

    //push new values
    db.update(params, function(err) {
        if (err) {
            console.log('Unable to update coin. Error:', JSON.stringify(err, null, 2));
        }
        else {
            console.log(`Coin value change: ${(100 * (delta - 1)).toFixed(2)}%`);
        }
    });

    //update holders' net worth if coin value increases
    if (data[data.length - 1] > data[data.length - 1] ) {
        const gbpData = await db.scan({ TableName: 'GBPs' }).promise();
        if (!gbpData || !gbpData.Items || !gbpData.Items.length) {
            return null;
        }

        gbpData.Items.forEach(user => {
            if (user.Coins) {
                const worth = getNetWorth(db, user, true, data[data.length - 1]);
                if (worth > user.HighScore) {
                    updateData(db, user.UserID, { HighScore: worth });
                }
            }
        });
    }

    //post results in chat
    post(client, newValues);
}

async function post(client, coinData) {
    if (coinData.length > 7 * 24) {
        coinData = coinData.slice(-7 * 24);
    }

    const current = coinData[coinData.length - 1];

    const delta = current - (
            coinData.length > 1
            ? coinData[coinData.length - 2]
            : coinData[0]
    );

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
                text: `1 NNC = ${commify(current)} GBPs`,
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

    //announce to the world
        const exchange = client.channels.cache.get(client.ids.channels.exchange);
        const discriminator = 'Stonks!';
        exchange.messages.fetch({ limit: 100 })
        .then(messages => {
            messages.filter(msg => msg.content.includes(discriminator))
            .forEach(msg => {
                msg.delete().catch(console.error);
                process.on('unhandledRejection', () => {});
            });
        });
        exchange.send({ content: `${discriminator} ${delta >= 0 ? '+' : ''}${commify(delta)}`, files: [await chart.toBinary()] });
}
