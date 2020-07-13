const { v4: uuidv4 } = require('uuid');
const { format, updateData, getData, generateWeapon } = require('../utils');
const items = require('../rpg/items.json');

module.exports = {
    name: 'buy',
    description: 'Spend your GBPs on consumables and weapons! Weapons will be low rarity and match your level',
    category: 'rpg',
    aliases: ['shop'],
    usage: '[item]',
    execute(client, config, db, message, args) {
        if (!args.length) {
            const reply = [
                '```',
                'Item\t\t\tCost\t  Description',
                '----\t\t\t----\t  -----------'
            ];
            
            Object.values(items).filter(i => i.cost && !i.hide).forEach(i => reply.push(`•${format(i.name, 15)}${format(i.cost, 4)}GBPs  ${i.description}`));
            reply.push('```');

            return message.channel.send(reply, { split: true });
        }

        const item = items[args.toLowerCase()] || Object.values(items).find(i => i.name.toLowerCase() === args.toLowerCase());

        if (item && item.cost && !item.hide) {
            getData(db, message.author.id)
            .then(data => {
                let text;
                if (!data.Responses || !data.Responses.GBPs) {
                    text = 'Something went wrong.';
                }
                else if(!data.Responses.GBPs.length) {
                    text = 'You must be new here.';
                }
                else if (data.Responses.GBPs[0].GBPs < item.cost) {
                    text = "You can't afford this!";
                }
                else if (data.Responses.GBPs[0].Inventory.length > 10 + 5 * (data.Responses.GBPs[0].Skills.backpack || 0)) {
                    text = 'Your inventory is full!';
                }
                else {
                    const i = item.weapon
                        ? generateWeapon(data.Responses.GBPs[0].Lvl, { type: item.type, chances: [9, 1, 0, 0] })
                        : { type: item.type, id: uuidv4() };
                    updateData(db, message.author, { gbps: -item.cost, inventory: i });
                    text = `Thank you for purchasing: ${item.name}`;
                }

                message.reply(text);
            });
        }
        else {
            message.reply('Item not found.');
        }
    }
};