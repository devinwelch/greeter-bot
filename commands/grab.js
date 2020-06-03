const { getData, updateData } = require('../utils.js');

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

            getData(db, message.author.id)
            .then(data => {
                const cowboy = `Hold on, cowboy, you only have ${data.Responses.GBPs[0].Stash} GBPs stashed away!`;

                if (!data.Responses || !data.Responses.GBPs || !data.Responses.GBPs.length) {
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

                updateData(db, message.author, { gbps: args, stash: -args, message: message, emoji: config.ids.drops });
            })
            .catch(console.error);
        }
        else {
            return client.commands.get('gbp').execute(client, config, db, message, args);
        }
    }
};