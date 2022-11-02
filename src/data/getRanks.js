import { getCoinData } from './getCoinData.js';
import { getNetWorth } from '../gbp/getNetWorth.js';

/**
 * Get array of limited user GBP data, sorted (descending) by net worth
 * @param {boolean=} includeRobots include greeter-bot in results   
 * @returns [{Username, UserID, HighScore, Worth}, ...] or null
 */

export async function getRanks(db, includeRobots=false) {
    let coinData = await getCoinData(db);
    if (!coinData) {
        return null;
    }
    coinData = coinData[coinData.length - 1];

    let gbpData = await db.scan({ TableName: 'GBPs' }).promise();
    if (!gbpData || !gbpData.Items || !gbpData.Items.length) {
        return null;
    }

    await gbpData.Items.forEach(async user => {
        user.cool = true;
        user.Worth = await getNetWorth(db, user, false, coinData);
    });

    gbpData = gbpData.Items.map(user => {
        //const worth = await getNetWorth(db, user, false, coinData);

        return {
            Username: user.Username,
            UserID: user.UserID,
            HighScore: user.HighScore,
            Worth: user.Worth
        };
    });

    gbpData.sort((a, b) => b.Worth - a.Worth);
    if (!includeRobots) {
        gbpData = gbpData.filter(user => user.Username !== 'greeter-bot');
    }

    return gbpData;
}