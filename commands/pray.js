const { getRandom, getGBPs, react } = require('../utils.js');

module.exports = {
    name: 'pray',
    description: 'Pray to RNGesus to cleanse you of your GBP debt. Random chance; can be used once per day.',
    execute(client, config, db, message, args) {
        if (message.author.prayed) {
             return;
        }

        pray(db, message);
    }
};

async function pray(db, message) {
    if (!getRandom(0)) {
        try {
            let data = await getGBPs(db, [message.author.id]);
            if (data.Responses && data.Responses.GBPs) {
                data = data.Responses.GBPs[0];
                if ((data.GBPs + data.Stash) < 0) {
                    const params = {
                        TableName: 'GBPs',
                        Key: { 'UserID': message.author.id },
                        UpdateExpression: 'set GBPs = :z, Stash = :z, HighScore = :z',
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
    
    react(message, ['🙏']);
    message.author.prayed = true;
}