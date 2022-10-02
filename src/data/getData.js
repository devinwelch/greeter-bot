/**
 * Get GBP data for user(s)
 * @param userIDs array or single user ID
 * @returns [{user1}, {user2}, ...] or null
 */

export async function getData(db, userIDs, forceArray=false) {
    let idArray = userIDs.slice();
    if (!Array.isArray(idArray)) {
        idArray = [idArray];
    }

    const params = { RequestItems: { 'GBPs': { Keys: idArray.map(id => { return { UserID : id }; }) } }};

    const data = await db.batchGet(params).promise();

    if (!data?.Responses?.GBPs || data.Responses.GBPs.length !== idArray.length) {
        return null;
    }
    
    return idArray.length === 1 && !forceArray ? data.Responses.GBPs[0] : data.Responses.GBPs;
}