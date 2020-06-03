const { getData } = require('../utils.js');

module.exports = {
    name: 'inventory',
    description: 'See what items you have in your inventory',
    execute(client, config, db, message, args) {
        getData(db, message.author.id)
        .then(data => {
            if (!data.Responses || !data.Responses.GBPs || !data.Responses.GBPs.length) {
                message.reply('Something went wrong.');
            }
            else {
                const inventory = data.Responses.GBPs[0].Inventory;
                const items = Object.keys(inventory).filter(i => i !== 'random').filter(i => inventory[i]);
                message.reply(`You have the following items: ${items.join(', ')}`);
            }
        });
    }
};