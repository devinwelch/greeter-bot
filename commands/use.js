const items = require('./items.json');
const { getData, updateData } = require('../utils.js');

module.exports = {
    name: 'use',
    description: 'Use an item from inventory or equip a weapon for duels.',
    aliases: ['equip'],
    usage: '[item|random]',
    execute(client, config, db, message, args) {
        args = args.toLowerCase();

        getData(db, message.author.id)
        .then(data => {
            if (!data.Responses || !data.Responses.GBPs || !data.Responses.GBPs.length) {
                return message.reply('Something went wrong.');
            }

            data = data.Responses.GBPs[0];

            if (!args.length) {
                const emojiID = data.Equipped === 'random' ? config.ids.random : items[data.Equipped].id;
                message.reply(`You have ${data.Equipped} equipped. ${client.emojis.resolve(emojiID)}`);
            }
            else if (!data.Inventory[args]) {
                message.reply('You do not have that item!');
            }
            else if (args === 'random' || items[args].weapon) {
                updateData(db, message.author.id, { equipped: args, message: message, emoji: '🦾' });
            }
            else {
                switch(args) {
                    case 'antidote':
                        useAntidote(config, db, message);
                        break;
                    case 'potion':
                        usePotion(db, message);
                        break;
                    case 'respec':
                        respec(db, message);
                        break;
                    default:
                        message.reply("I don't know what to do with that.");
                }
            }
        });
    }
};

function useAntidote(config, db, message) {
    updateData(db, message.author, { inventory: { antidote: false } });

    if (message.member.roles.cache.has(config.ids.corona)) {
        message.member.roles.remove(config.ids.corona)
            .catch(console.error);
    }

    message.reply('You have been cured of coronavirus! Stay safe...');
}

function usePotion(db, message) {
    updateData(db, message.author, { inventory: { potion: false } });

    message.author.dorseProtection = true;
    message.reply('Dorse protection activated.');
}

function respec(db, message) {
    updateData(db, message.author, { inventory: { respec: false }, skills: {} });

    message.reply('Skill points returned.'); 
}