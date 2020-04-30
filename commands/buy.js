const items = require('./items.json');
const { updateGBPs } = require('../utils.js');

const self = module.exports = {
    name: 'buy',
    description: 'Spend your good boy points on **useful** items!',
    aliases: ['shop'],
    usage: '[item]',
    execute(client, config, db, message, args) {
        if (!args.length) {
            const reply = ['```Item\t\t\tCost\t\tDescription',
                              '----\t\t\t----\t\t-----------'];
            
            for (var i of Object.keys(items)) {
                i = items[i];
                i.name += ' '.repeat(Math.max(16 - i.name.length, 0));
                reply.push(`•${i.name}${i.cost}${' '.repeat(Math.max(3 - i.cost.toString().length, 0))} GBPs\t${i.description}`);
            }
            reply.push('```');

            return message.channel.send(reply, {split: true});
        }

        const item = items[args];
        if (item) {
            const params = {
                TableName: 'GBPs',
                Key: { 'UserID': message.author.id }
            };
        
            db.get(params, function(err, data) {
                if (err) {
                    console.error('Unable to search for user. Error:', JSON.stringify(err, null, 2));
                    message.reply("Shop's closed!");
                } 
                else if (!data.Item || data.Item.GBPs < item.cost) {
                    message.reply("You can't afford this.");
                } 
                else if (data.Item.Inventory[item.name]) {
                    message.reply('You already have this!');
                }
                else {
                    self.buy(db, message, item);
                }
            });
        }
        else {
            message.reply('Item not found.');
        }
    },
    buy(db, message, item) {
        const params = {
            TableName: 'GBPs',
            Key: { 'UserID': message.author.id },
            UpdateExpression: `set Inventory.${item.name} = :b`,
            ExpressionAttributeValues:{ ':b': true }
        };

        db.update(params, function(err) {
            if (err) {
                console.log(JSON.stringify(err, null, 2));
                console.log(`Could not give ${item.name} to ${message.author.username}: `, JSON.stringify(err, null, 2));
                message.reply('An error occured. Tell bus.');
            }
            else {
                console.log(`${message.author.username} bought ${item.name}`);
                message.reply(`Thank you for purchasing: ${item.name}`);
                updateGBPs(db, message.author, -item.cost);
            }
        });
    }
};