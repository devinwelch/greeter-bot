const { updateData, getData } = require('../utils.js');

module.exports = {
    name: 'loan',
    description: "Take out a loan from greeter-bot. Be careful, he's a shark; he will collect 110% at midnight(EST).\n" + 
                 'Use no arguments to check the status of your loan or see how much you qualify for.',
    category: 'gbp',
    usage: '[amount]',
    execute(client, config, db, message, args) {
        //return before querying
        if (args.length) {
            //force user to use specific number, not 'max'
            if (isNaN(args)) {
                return message.reply('Please use a number for your request!');
            }
            //don't give 0 or negative loan
            else if (args < 1) {
                return message.reply('I oughtta break your legs for that one.');
            }
        }

        getData(db, message.author.id)
        .then(data => {
            if (!data.Responses || !data.Responses.GBPs || !data.Responses.GBPs.length) {
                return message.reply('Something went wrong.');
            }
            
            data = data.Responses.GBPs[0];
            args = Math.floor(args);

            //user inquiry
            if (!args) {
                //user has 0 loan
                if (!data.Loan) {
                    message.reply(`I can lend you up to ${getMaxLoan(data)} GBPs.`);
                }
                //threaten to reclaim loan amount + 10% interest
                else {
                    message.reply(`You have a loan out for ${data.Loan} GBPs. I will collect ${Math.ceil(data.Loan * 1.1)} tonight...`);
                }
            }
            //loan request
            else {
                //user already has loan
                if (data.Loan) {
                    message.reply(`You already have a loan for ${data.Loan}`);
                }
                //user asked for too much
                else if (args > getMaxLoan(data)) {
                    message.reply('Denied. Prove your worth before you try to borrow that much.');
                }
                //give a loan
                else {
                    updateData(db, message.author, { gbps: args, loan: args });
                    updateData(db, client.user, { gbps: -args });
                    message.reply('Done, but you better have my money by midnight...');
                } 
            }
        });
    }  
};

function getMaxLoan(data) {
    //Average of current GBPs and highest achieved GBPs
    return Math.max(Math.ceil((data.GBPs + data.HighScore) / 2), 0);
}