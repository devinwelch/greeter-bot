const { v4: uuidv4 } = require('uuid');
const { format, updateData, getData, getCoinData } = require('../utils');
const items = require('../rpg/items.json');

module.exports = {
    name: 'buy',
    description: 'Spend your GBPs on consumables and weapons! Weapons will be low rarity and match your level',
    category: 'rpg',
    aliases: ['shop'],
    usage: '[amount] [item]',
    execute: async function(client, config, db, message, args) {
        const coinData = await getCoinData(db);
        if (coinData) {
            items.coin.cost = coinData[coinData.length - 1];
        }
        else {
            return message.reply('Something went wrong.');
        }

        if (!args.length) {
            const reply = [
                '```',
                'Item\t\t\tCost\t\tDescription',
                '----\t\t\t----\t\t-----------'
            ];
            
            Object.values(items).filter(i => i.cost && !i.hide).forEach(i => reply.push(`•${format(i.name, 15)}${format(i.cost, 6)}GBPs  ${i.description}`));
            reply.push('```');

            return message.channel.send(reply, { split: true });
        }

        let product, amount, text;
        const pattern = /\d+/;

        if (args.test(pattern)) {
            const match = args.match(pattern);
            amount = Number(match[0]);
            product = (args.substring(0, match.index) + args.substring(match.index + match[0].length, args.length)).trim();
        }
        else {
            amount = 1;
            product = args.trim();
        }

        const item = items[product.toLowerCase()] || Object.values(items).find(i => i.name.toLowerCase() === args.toLowerCase());

        if (!item || !item.cost || item.hide) {
            text = 'Item not found.';
        }

        const data = await getData(db, message.author.id);
        if (!data || !data.Responses || !data.Responses.GBPs || !data.Responses.GBPs.length) {
            text = 'Something went wrong.';
        }
        else if (data.Responses.GBPs[0].GBPs < item.cost * amount) {
            text = "You can't afford this!";
        }
        else if (data.Responses.GBPs[0].Inventory.length > 9 + amount + 5 * (data.Responses.GBPs[0].Skills.backpack || 0)) {
            text = 'Your inventory is full!';
        }
        else {
            const params = { gbps: -item.cost * amount };
            if (item.lootbox) {
                params.boxes = amount;
            }
            else if (item.coin) {
                params.coins = amount;
            }
            else {
                params.inventory = { type: item.type, id: uuidv4() };
            }
            
            updateData(db, message.author, params);
            text = `Thank you for purchasing: ${amount}x ${item.name}`;
        }

        message.reply(text);
    }
};