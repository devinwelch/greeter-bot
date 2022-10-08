import { getCoinData } from '../data/getCoinData.js';
import { Weapon } from '../rpg/classes/weapon.js';
import { Item } from '../rpg/classes/item.js';

/**
 * gets the net worth of a user
 * @param db AWS database
 * @param userData GBPs single item {}
 * @param includeInventory include value of inventory, default:true
 * @param coinValue cached coin data, to prevent new Gets
 * @returns int
 */

export async function getNetWorth(db, userData, includeInventory=true, coinValue) {
    if (!coinValue) {
        const coinData = await getCoinData(db);
        if (!coinData) {
            return null;
        }
        coinValue = coinData[coinData.length - 1];
    }
    
    const items = userData.Inventory.slice(1).reduce((a, b) => {
        const item = b.weapon ? new Weapon(null, b) : new Item(b);
        return a + item.sell();
    }, 0);

    return userData.GBPs
        + userData.Stash
        + userData.Coins * coinValue
        + (includeInventory ? items : 0)
        - userData.Loan;
}