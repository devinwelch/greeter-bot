const { getData } = require('../utils');

module.exports = {
    name: 'whatarethechancesthatiwillberedeemedpleasegreetyboyireallyneedyourhelpiwasinabadplacebutiambetternow',
    description: 'Check your faith!',
    category: 'gbps',
    execute(client, config, db, message, args) {
        getData(db, message.author.id).then(data =>  {
            if (data.Responses && data.Responses.GBPs && data.Responses.GBPs.length) {
                data = data.Responses.GBPs[0];
                if (data.GBPs + data.Stash - data.Loan >= 0) {
                    message.reply('You are a Good Boy™!');
                }
                else {
                    message.reply(`You have a ${data.Faith || 1}% chance of redemption.`);
                }
            }
        });
    }
};