const { getData, updateData } = require('../utils.js');

module.exports = {
    name: 'pay',
    description: 'Pay back your loan early.',
    category: 'gbp',
    aliases: ['repay', 'payloan'],
    execute(client, config, db, message, args) {
        //get users GBP and loan data
        getData(db, message.author.id)
        .then(data => {
            if (!data.Responses || !data.Responses.GBPs) {
                return message.reply('Something went wrong.');
            }
            else {
                data = data.Responses.GBPs[0];
            }
    
            //user doesn't have loan
            if (!data.Loan) {
                message.reply("You don't owe anything!");
            }
            else {
                //interest = 10%
                const total = Math.ceil(data.Loan * 1.1);
                
                //user cannot afford to pay back yet
                if (data.GBPs < total) {
                    message.reply(`You don't have enough yet! Come back with ${total} GBPs or I'll take it myself.`);
                }
                //pay back loan
                else {
                    updateData(db, message.author, { gbps: -total, loan: 0 });
                    updateData(db, client.user, { gbps: total });
                    message.reply('Thank you, come again!');
                }
            }
        });
    }
};