const { establishGBPs, updateGBPs, delay, getRandom } = require('../utils.js');

module.exports = {
    name: 'gamble',
    description: "Gamble with your GBPs. Roll 1-100, higher than 55 wins! Hit 100 for jackpot. Don't try any funny business...",
    aliases: ['bet'],
    usage: '<(amount)|max|all>',
    execute(client, config, db, message, args) {
        const user = message.author;

        if (isNaN(args) && args !== 'max' && args !== 'all') {
            return message.reply("Please don't do this to me");
        }

        const params = {
            TableName: 'GBPs',
            Key: { 'UserID': user.id }
        };
        
        db.get(params, function(err, data) {
            if (err) {
                console.error(`Error. Unable to find search for ${user.username}`);
                message.channel.send('Error. Unable to reach DB.');
            } 
            else if (!data.Item) {
                establishGBPs(db, user, 0);
                message.channel.send("You're broke!");
            } 
            else {
                const wager = args === 'max' || args === 'all' ? data.Item.GBPs : Math.floor(args);

                if (wager > data.Item.GBPs) {
                    message.reply(`Ez there sport, you only have ${data.Item.GBPs} GBPs!`);
                }
                else if (wager < 1) {
                    message.reply('Get your dirty money out of here.');
                }
                else {
                    const roll = getRandom(1, 100);
                    let resultMessage, win;

                    if (roll === 100) {
                        const bonus = getRandom(2, 5);
                        resultMessage = `\nYou win big! ${bonus}x multiplier!`;
                        win = bonus * wager;
                    }
                    else if (roll > 55) {
                        resultMessage = `\nYou win ${wager} GBPs!`;
                        win = wager;
                    }
                    else {
                        resultMessage = `\nYou lose ${wager} GBPs.`;
                        win = -wager;
                    }

                    message.channel.send(`Higher than 55 wins. ${user.username} rolled: `)
                        .then(msg => {
                            delay(5000).then(() => {
                                msg.edit(msg.content + roll + resultMessage);
                            });
                        }).catch(console.error);

                    updateGBPs(db, user, win);
                    updateGBPs(db, client.user, -win);
                }
            }
        });
    }
};