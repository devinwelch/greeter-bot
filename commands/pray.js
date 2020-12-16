const { react, getData, updateData, getChance } = require('../utils.js');

const self = module.exports = {
    name: 'pray',
    description: 
        'Pray to RNGesus to cleanse you of your GBP debt. Random chance; can be used once per day.\n' +
        "😇: you are a Good Boy\t🙏: your prayers have been heard\t**Response: you've been redeemed**",
    category: 'gbp'
};

self.execute = async function(client, config, db, message, args) {
    if (!client.prayers.includes(message.author.id)) {
        let data = await getData(db, message.author.id);

        if (data.Responses && data.Responses.GBPs && data.Responses.GBPs.length) {
            data = data.Responses.GBPs[0];

            if ((data.GBPs + data.Stash - data.Loan) < 0) {
                react(message, '🙏');
                client.prayers.push(message.author.id);

                if (getChance(data.Faith || 1)) {
                    const params = {
                        TableName: 'GBPs',
                        Key: { 'UserID': message.author.id },
                        UpdateExpression: 'set GBPs = :z, Stash = :z, HighScore = :z, Loan = :z, Faith = :z, Coins = :z',
                        ExpressionAttributeValues: { ':z': 0 }
                    };

                    db.update(params, function(err) {
                        if (err) {
                            console.error('Unable to zero user. Error JSON:', JSON.stringify(err, null, 2));
                        }
                        else {
                            console.log(`${message.author.username} has been redeemed!`);
                            message.reply("RNGesus's blessings be upon you.");
                        }
                    });
                }
                else {
                    updateData(db, message.author, { faith: 2 });
                }
            }
            else {
                react(message, '😇');
            }
        }
    }
};