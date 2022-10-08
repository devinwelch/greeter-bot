import { addToBuybacks } from './addToBuybacks.js';
import { updateData } from '../data/updateData.js';
import { getData } from '../data/getData.js';
import { Item } from './classes/item.js';

/**
 * Adds item to user inventory. Returns true if item added to buybacks instead.
 * @param user Discord User or userID
 * @param item Item or Weapon
 * @returns boolean or null
 */

export async function addToInventory(client, db, user, item) {
    const id = user.id || user;

    const data = await getData(db, id);
    if (!data) {
        return;
    }

    if (!item.weapon) {
        item = new Item(item);
    }

    if (inventoryFull(data, item.type)) {
        addToBuybacks(client, user, item);
        updateData(db, user, { gbps: item.sell() });
        return true;
    }
    else {
        updateData(db, user, { inventory: item });
        return false;
    }
}

export function inventoryFull(data, type) {
    if (type === 'pass'   ||
        type === 'coin'   ||
        type === 'ticket' ||
        type === 'lootbox')
    {
        return false;
    }

    if (data.Inventory.length <= 10 + 5 * (data.Skills.backpack || 0)) {
        return false;
    }

    if (data.Inventory.some(itemStack => itemStack.type === type && itemStack.quantity < 20)) {
        return false;
    }

    return true;
}