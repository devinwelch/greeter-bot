import { generateWeapon } from '../rpg/generateWeapon.js';
import { getLvl } from '../rpg/getLvl.js';

/**
 * Create new user in DB
 * @param db 
 * @param user Discord user
 * @param {*=} options { gbps, coins, xp }
 * @returns void
 */

export function putData(db, user, options) {
    const params = {
        TableName: 'GBPs',
        Item: {
            UserID      : user.id || user,
            Username    : user.username.toLowerCase() || user,
            GBPs        : options.gbps || 0,
            HighScore   : options.gbps || 0,
            Stash       : 0,
            Loan        : 0,
            Coins       : options.coins || 0,
            Boxes       : 0,
            Inventory   : [generateWeapon({ lvl: 1 }, { type: 'fists', chances: [1, 0, 0, 0, 0], plain: true })],
            Equipped    : 0,
            Team        : 'none',
            Lvl         : getLvl(options.xp || 1),
            XP          : options.xp || 0,
            Skills      : {},
            Faith       : 0
        }
    };

    db.put(params, function(err) {
        if (err) {
            console.error(`Unable to add ${params.Item.Username}:`, JSON.stringify(err, null, 2));
        }
        else {
            console.log(`Added ${params.Item.Username}:`, JSON.stringify(params.Item, null, 2));
        }
    });
}