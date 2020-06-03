const { getData, updateData, delay, getRandom } = require('../utils.js');

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

        getData(db, user.id)
        .then(data => {
            if (!data.Responses || !data.Responses.GBPs) {
                return message.reply('Something went wrong.');
            }
            else if(!data.Responses.GBPs.length) {
                return message.reply('You must be new here.');
            }

            data = data.Responses.GBPs[0];
            const wager = args === 'max' || args === 'all' ? data.GBPs : Math.floor(args);

            if (wager < 1) {
                message.reply('Get your dirty money out of here.');
            }
            else if (wager > data.GBPs) {
                message.reply(`Ez there sport, you only have ${data.GBPs} GBPs!`);
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

                updateData(db, user, { gbps: win/*, xp: Math.min(Math.abs(win), 1000)*/ });
                updateData(db, client.user, { gbps: -win });
            }
        });
    }
};