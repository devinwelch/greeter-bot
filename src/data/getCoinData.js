//TODO cache coin value

/**
 * Get array of nannercoin values
 * @returns int[] or null
 */

export async function getCoinData(db) {
    const data = await db.get({ TableName: 'Coin', Key: { Key: 0 }}).promise();
    if (!data?.Item) {
        return null;
    }

    return data.Item.Values;
}