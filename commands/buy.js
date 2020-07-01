const items = require('./items.json');
const { format, updateData, getData } = require('../utils.js');

module.exports = {
    name: 'buy',
    description: 'Spend your good boy points on **useful** items!',
    category: 'rpg',
    aliases: ['shop'],
    usage: '[item]',
    execute(client, config, db, message, args) {
        if (!args.length) {
            const reply = [
                '```',
                'Item\t\t\tCost\t\tDescription',
                '----\t\t\t----\t\t-----------'
            ];
            
            Object.values(items).filter(i => !i.hide).forEach(i => reply.push(`•${format(i.name, 15)}${format(i.cost, 4)}GBPs\t${i.description}`));
            reply.push('```');

            return message.channel.send(reply, { split: true });
        }

        const item = items[args.toLowerCase()];
        if (item && !item.hide) {
            getData(db, message.author.id)
            .then(data => {
                if (!data.Responses || !data.Responses.GBPs) {
                    return message.reply('Something went wrong.');
                }
                else if(!data.Responses.GBPs.length) {
                    return message.reply('You must be new here.');
                }

                data = data.Responses.GBPs[0];

                if (data.GBPs < item.cost) {
                    message.reply("You can't afford this!");
                }
                else if (data.Inventory[item.name]) {
                    message.reply('You already have this!');
                }
                else {
                    updateData(db, message.author, { gbps: -item.cost, inventory: { [item.name]: true}});
                    message.reply(`Thank you for purchasing: ${item.name}`);
                }
            });
        }
        else {
            message.reply('Item not found.');
        }
    }
};