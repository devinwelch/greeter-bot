import { getCoinData } from '../data/getCoinData.js';
import { updateData } from '../data/updateData.js';
import { getNetWorth } from '../gbp/getNetWorth.js';
import { getRandom } from '../utils/random.js';

/**
 * increments value of nannercoin
 * @param db 
 */

export async function stonks(db) {
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
        delta += getRandom(-20 * divider, 20 * divider);
    }
    delta = 1 + delta / divider / iterations / 100;
    data.push(Math.ceil(current * delta));

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
}