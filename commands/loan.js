const { establishGBPs, updateGBPs } = require('../utils.js');

let self = module.exports = {
    name: 'loan',
    description: "Take out a loan from greeter-bot. Be careful, he's a shark; he will collect 110% at midnight(EST).\n\
Use no arguments to check the status of your loan or see how much you qualify for.",
    usage: '[amount]',
    execute(client, config, db, message, args) {
        if (!args) {
            const loanParams = {
                TableName: 'Loans',
                Key: { 'UserID': message.author.id }
            };

            db.get(loanParams, function(err, loanData) {
                if (err) {
                    console.error('Unable to query loan. Error:', JSON.stringify(err, null, 2));
                }
                else if (loanData.Item) {
                    message.reply(`You have a loan out for ${loanData.Item.Amount} GBPs. I will collect ${Math.ceil(loanData.Item.Amount * 1.1)} tonight...`);
                }
                else {
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
                            message.reply("I don't trust you yet.");
                        }
                        else {
                            message.reply(`I can lend you up to ${self.getMaxLoan(gbpData)} GBPs.`);
                        }
                    });
                }
            });
        }
        else if (isNaN(args)) {
            message.reply('Please use a number for your request!');
        }
        else if (args < 1) {
            message.reply('I oughtta break your legs for that one.');
        }
        else {
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
                    message.reply("I don't trust you yet.");
                }
                else if (args > self.getMaxLoan(gbpData)) {
                    message.reply('Denied. Prove your worth before you try to borrow that much.');
                }
                else {
                    const loanParams = {
                        TableName: 'Loans',
                        Item: { 
                            'UserID': message.author.id,
                            'Amount': args, 
                            'Username': message.author.username
                        },
                        Key: { 'UserID': message.author.id }
                    };
                    
                    db.get(loanParams, function(err, data) {
                        if (err) {
                            console.error('Unable to query loan. Error:', JSON.stringify(err, null, 2));
                        } 
                        else if (!data.Item) {
                            db.put(loanParams, function(err) {
                                if (err) {
                                    console.error('Unable to establish loan. Error:', JSON.stringify(err, null, 2));
                                } else {
                                    args = Math.floor(args);
                                    console.log(`Loan given to ${message.author.username} for ${args} GBPs`);
                                    updateGBPs(db, message.author, args);
                                    updateGBPs(db, client.user, -args);
                                    message.reply('Done, but you better have my money by midnight...');
                                }
                            });
                        } 
                        else  {
                            message.reply(`You already have a loan for ${data.Item.Amount}`);
                        }
                    });
                }
            });  
        }
    },
    getMaxLoan(data) {
        if (isNaN(data.Item.HighScore)) {
            data.Item.HighScore = 0;
        }
        return Math.max((data.Item.GBPs + data.Item.HighScore) / 2, 0);
    }
};