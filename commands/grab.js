const { getGBPs, react } = require('../utils.js');

module.exports = {
    name: 'grab',
    description: 'Withdraw GBPs from your stash.',
    usage: '[amount]',
    execute(client, config, db, message, args) {
        if (args || args.length) {
            if (isNaN(args)) {
                if (args.toLowerCase() !== 'max' && args.toLowerCase() !== 'all') {
                    return message.reply("Please use a number or 'max' or 'all'.");
                }
            }
            else if (Number(args) <= 0) {
                return message.reply('why');
            }

            getGBPs(db, [message.author.id])
            .then(data => {
                const cowboy = `Hold on, cowboy, you only have ${data.Responses.GBPs[0].Stash} GBPs stashed away!`;

                if (!data.Responses || !data.Responses.GBPs) {
                    return message.reply('Something went wrong.');
                }
                else if (!isNaN(args) && data.Responses.GBPs[0].Stash < args) {
                    return message.reply(cowboy);
                }
                else if (isNaN(args)) {
                    args = data.Responses.GBPs[0].Stash;
                }
                else {
                    args = Math.floor(args);
                }

                const params = {
                    TableName: 'GBPs',
                    Key: { 'UserID': message.author.id },
                    UpdateExpression: 'set GBPs = GBPs + :g, Stash = Stash + :s',
                    ExpressionAttributeValues: { ':g': args, ':s': -args }
                };
                db.update(params, function(err) {
                    if (err) {
                        console.error('Unable to stash GBPs. Error JSON:', JSON.stringify(err, null, 2));
                        message.reply('Something went wrong.');
                    }
                    else {
                        console.log(`${message.author.username} grabbed ${args} GBPs`);
                        react(message, [config.ids.drops]);
                    }
                });
            })
            .catch(console.error);
        }
        else {
            return client.commands.get('gbp').execute(client, config, db, message, args);
        }
    }
};