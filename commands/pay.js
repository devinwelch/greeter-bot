const { establishGBPs, updateGBPs } = require('../utils.js');

module.exports = {
    name: 'pay',
    description: 'Pay back your loan early.',
    aliases: ['repay', 'payloan'],
    execute(client, config, db, message, args) {
        const loanParams = {
            TableName: 'Loans',
            Key: { 'UserID': message.author.id }
        };

        db.get(loanParams, function(err, loanData) {
            if (err) {
                console.error('Unable to query loan. Error:', JSON.stringify(err, null, 2));
            }
            else if (!loanData.Item) {
                message.reply("You don't owe anything!");
            }
            else {
                const total = Math.ceil(loanData.Item.Amount * 1.1);

                const gbpParams = {
                    TableName: 'GBPs',
                    Key: { 'UserID': message.author.id }
                };

                db.get(gbpParams, function(err, gbpData) {
                    if (err) {
                        console.error('Unable to query GBPs. Error:', JSON.stringify(err, null, 2));
                    }
                    else if (!gbpData.Item) {
                        establishGBPs(db, message.author, 0);
                        message.reply('How do you have a loan and no GBPs?!');
                    }
                    else if (gbpData.Item.GBPs < total) {
                        message.reply(`You don't have enough yet! Come back with ${total} GBPs or I'll take it myself.`);
                    }
                    else {
                        updateGBPs(db, message.author, -total);
                        updateGBPs(db, client.user, total);

                        db.delete(loanParams, function(err) {
                            if (err) {
                                console.error('Unable to delete item. Error:', JSON.stringify(err, null, 2));
                                message.reply('An error occured. Try again later.');
                            } else {
                                updateGBPs(db, message.author, -total);
                                updateGBPs(db, client.user, total);
                                message.reply('Thank you, come again!');
                            }
                        });
                    }
                });
            }
        });
    }
};