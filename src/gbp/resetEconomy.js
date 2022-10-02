/**
 * Reset the GBP economy
 * @param data Reset data
 * @retuns void
 */

export function resetEconomy(client, db, data) {                    
    console.log('Resetting the economy!');
    client.channels.cache.get(client.ids.channels.botchat).send('**From the ashes we are born anew. The GBP economy has been reset. Go forth!**');
    
    data.Items.filter(r => !r.Executed).forEach(r => {
        const resetParams = {
            TableName: 'Resets',
            Key: { 'Date': r.Date },
            UpdateExpression: 'set Executed = :t',
            ExpressionAttributeValues: { ':t': true }
        };
        db.update(resetParams, function(err) {
            if (err) {
                console.error('Unable to mark resets. Error JSON:', JSON.stringify(err, null, 2));
            }
            else {
                db.scan({ TableName: 'GBPs' }, function(err, gbpData) {
                    if (err) {
                        console.error('Unable get GBP data for reset. Error:', JSON.stringify(err, null, 2));
                    }
                    else {
                        gbpData.Items.forEach(user => {
                            const gbpParams = {
                                TableName: 'GBPs',
                                Key: { 'UserID': user.UserID },
                                UpdateExpression: 'set GBPs = :z, Stash = :z, HighScore = :z, Loan = :z, Coins = :z',
                                ExpressionAttributeValues: { ':z': 0 }
                            };

                            if (user.Lvl === 1) {
                                db.deleteItem(gbpParams, function(err) {
                                    if (err) {
                                        console.error(`Unable to delete user ${user.Username}. Error JSON:`, JSON.stringify(err, null, 2));
                                    }
                                    else {
                                        console.log(`Deleted user ${user.Username}. SEE YA NERD`);
                                    }
                                });
                            }
                            else {
                                db.update(gbpParams, function(err) {
                                    if (err) {
                                        console.error(`Unable to zero user ${user.Username}. Error JSON:`, JSON.stringify(err, null, 2));
                                    }
                                });
                            }
                        });

                        const coinParams = { 
                            TableName: 'Coin', 
                            Key: { Key: 0 },
                            UpdateExpression: 'set #v = :v',
                            ExpressionAttributeNames: { '#v': 'Values' },
                            ExpressionAttributeValues: { ':v': [100, 100] }
                        };

                        db.update(coinParams, function(err) {
                            if (err) {
                                console.error('Unable to update coin. Error JSON:', JSON.stringify(err, null, 2));
                            }
                        });
                    }
                });
            }
        });
    });
}