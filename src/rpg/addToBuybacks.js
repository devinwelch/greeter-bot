/**
 * Add item to temporary buybacks shop
 * @param {*} client 
 * @param user Discord User or userID
 * @param item Item or Weapon
 * @returns void
 */

export function addToBuybacks(client, user, item) {
    const id = user.id || user;

    if (client.buybacks[id]) {
        client.buybacks[id].push(item);
    }
    else {
        client.buybacks[id] = [item];
    }
}