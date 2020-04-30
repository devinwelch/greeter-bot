const items = require('./items.json');
const { establishGBPs } = require('../utils.js');

const self = module.exports = {
    name: 'use',
    description: 'Use an item from inventory or equip a weapon for duels.',
    aliases: ['equip'],
    usage: '[item|random]',
    execute(client, config, db, message, args) {
        const params = { 
            TableName: 'GBPs',
            Key: { UserID: message.author.id }
        };

        db.get(params, function(err, data) {
            if (err) {
                console.log(err);
            }
            else if (!data.Item) {
                establishGBPs(db, message.author, 0);
                message.reply('Added you to the club.');
            }
            else if (!args.length) {
                const emojiID = data.Item.Equipped === 'random' ? config.ids.random : items[data.Item.Equipped].id;
                message.reply(`You have ${data.Item.Equipped} equipped. ${client.emojis.cache.get(emojiID)}`);
            }
            else if (args !== 'random' && !data.Item.Inventory[args]) {
                message.reply('You do not have that item!');
            }
            else if (args === 'random' || items[args].weapon) {
                params.UpdateExpression = 'set Equipped = :e';
                params.ExpressionAttributeValues = { ':e': args };

                db.update(params, function(err) {
                    if (err) {
                        message.reply('Unable to equip item. Please try again later.');
                        console.log(err);
                    }
                    else {
                        message.react('🦾');
                    }
                });
            }
            else {
                switch(args) {
                    case 'antidote':
                        self.useAntidote(config, db, params, message);
                        break;
                    default:
                        message.reply("I don't know what to do with that.");
                }
            }
        });
    },
    useAntidote(config, db, params, message) {
        params.UpdateExpression = 'set Inventory.antidote = :f';
        params.ExpressionAttributeValues = { ':f': false };

        db.update(params, function(err) {
            if (err) {
                message.reply('Unable use antidote. Please try again later.');
                console.log(err);
            }
            else {
                if (message.member.roles.cache.has(config.ids.corona)) {
                    message.member.roles.remove(config.ids.corona)
                        .then(console.log)
                        .catch(console.error);
                }
                message.reply('You have been cured of coronavirus! Stay safe...');
            }
        });       
    }
};