import { getCoinData } from './getCoinData.js';
import { Weapon } from '../rpg/classes/weapon.js';
import { Item } from '../rpg/classes/item.js';

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

    gbpData = gbpData.Items.map(user => {
        const items = user.Inventory.slice(1).reduce((a, b) => {
            const item = b.weapon ? new Weapon(b) : new Item(b);
            return a + item.sell();
        }, 0);

        const coins = user.Coins * coinData;

        return {
            Username: user.Username,
            UserID: user.UserID,
            HighScore: user.HighScore,
            Worth: user.GBPs + user.Stash - user.Loan + coins + items
        };
    });

    gbpData.sort((a, b) => b.Worth - a.Worth);
    if (!includeRobots) {
        gbpData = gbpData.filter(user => user.Username !== 'greeter-bot');
    }

    return gbpData;
}