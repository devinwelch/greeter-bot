const { getRandom, getData, react } = require('../utils.js');

module.exports = {
    name: 'pray',
    description: "Pray to RNGesus to cleanse you of your GBP debt. Random chance; can be used once per day. You'll be told if it works!",
    category: 'gbp',
    execute(client, config, db, message, args) {
        if (!client.prayers.includes(message.author.id)) {
            client.prayers.push(message.author.id);
            pray(db, message);
        }

        react(message, ['🙏']);
    }
};

async function pray(db, message) {
    if (!getRandom(19)) {
        try {
            let data = await getData(db, message.author.id);
            if (data.Responses && data.Responses.GBPs) {
                data = data.Responses.GBPs[0];
                if ((data.GBPs + data.Stash) < 0) {
                    const params = {
                        TableName: 'GBPs',
                        Key: { 'UserID': message.author.id },
                        UpdateExpression: 'set GBPs = :z, Stash = :z, HighScore = :z, Loan = :z',
                        ExpressionAttributeValues: { ':z': 0 }
                    };
                    db.update(params, function(err) {
                        if (err) {
                            console.error('Unable to zero user. Error JSON:', JSON.stringify(err, null, 2));
                        }
                        else {
                            message.reply("RNGesus's blessings be upon you.");
                        }
                    });
                }
            }
        }
        catch (err) {
            console.log(err);
        }
    }
}