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

        let product, amount;
        const pattern = /^\d+/;

        if (pattern.test(args)) {
            const match = args.match(pattern);
            amount = Number(match[0]);

            if (!amount) {
                return;
            }

            product = (args.substring(0, match.index) + args.substring(match.index + match[0].length, args.length)).trim();
        }
        else {
            amount = 1;
            product = args.trim();
        }

        const item = items[product.toLowerCase()] || Object.values(items).find(i => i.name.toLowerCase() === args.toLowerCase());

        if (!item || !item.cost || item.hide) {
            return message.reply('Item not found.');
        }

        let data = await getData(db, message.author.id);
        if (!data || !data.Responses || !data.Responses.GBPs || !data.Responses.GBPs.length) {
            return message.reply('Something went wrong.');
        }
            
        data = data.Responses.GBPs[0];   

        if (!item.lootbox && !item.coin) {
            amount = Math.min(amount, 11 + 5 * (data.Skills.backpack || 0) - data.Inventory.length);
            if (amount < 1) {
                return message.reply('Your inventory is full!');
            }
        }        
                
        if (data.GBPs < item.cost * amount) {
            return message.reply("You can't afford this!");
        }

        const params = { gbps: -item.cost * amount };
        if (item.lootbox) {
            params.boxes = amount;
        }
        else if (item.coin) {
            params.coins = amount;
        }
        else {
            params.inventory = [];
            for (let i = 0; i < amount; i++) {
                params.inventory.push({ type: item.type, id: uuidv4() });
            }
        }
        
        updateData(db, message.author, params);
        return message.reply(`Thank you for purchasing: ${amount}x ${item.name}`);
    }
};