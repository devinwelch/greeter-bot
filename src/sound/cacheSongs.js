/**
 * Cache quest song list
 * @param {*} client 
 * @param {*} db 
 */

export async function cacheSongs(client, db) {
    const data = await db.scan({ TableName: 'Songs' }).promise();

    if (data?.Count) {
        client.questSongs = data.Items;
        console.log('Quest songs cached.');
    }
}