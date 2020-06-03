const { getData, updateData } = require('../utils.js');

module.exports = {
    name: 'stash',
    description: "Set aside GBPs for a rainy day. Don't want to walk into a casino with all your money, right?",
    aliases: ['stache'],
    usage: '[amount|max|all]',
    execute(client, config, db, message, args) {
        if (args.length) {
            if (isNaN(args)) {
                if (args.toLowerCase() !== 'max' && args.toLowerCase() !== 'all') {
                    return message.reply("Please use a number or 'max' or 'all'.");
                }
            }
            else if (Number(args) === 0) {
                return message.reply('why');
            }
            else if (args < 0) {
                return client.commands.get('grab').execute(client, config, db, message, -args);
            }

            getData(db, message.author.id)
            .then(data => {
                const cowboy = `Hold on, cowboy, you only have ${data.Responses.GBPs[0].GBPs} GBPs!`;

                if (!data.Responses || !data.Responses.GBPs || !data.Responses.GBPs.length) {
                    return message.reply('Something went wrong.');
                }
                else if (!isNaN(args) && data.Responses.GBPs[0].GBPs < args) {
                    return message.reply(cowboy);
                }
                else if (isNaN(args)) {
                    if (data.Responses.GBPs[0].GBPs <= 0) {
                        return message.reply(cowboy);
                    }
                    args = data.Responses.GBPs[0].GBPs;
                }
                else {
                    args = Math.floor(args);
                }

                updateData(db, message.author, { gbps: -args, stash: args, message: message, emoji: config.ids.drops });
            })
            .catch(console.error);
        }
        else {
            return client.commands.get('gbp').execute(client, config, db, message, args);
        }
    }
};