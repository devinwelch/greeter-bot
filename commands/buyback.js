const { getData, updateData, react } = require('../utils.js');

const self = module.exports = {
    name: 'buyback',
    description: 'Re-purchase sold or lost loot. This inventory will be dumped periodically, so act fast! React with "💸" to purchase item.',
    aliases: ['bb'],
    category: 'rpg'
};

self.execute = async function(client, config, db, message, args) {
    let index = 0;

    //do not proceed if no buybacks available
    const buybacks = client.buybacks[message.author.id];
    if (!buybacks || !buybacks.length) {
        return message.reply('Sold out!');
    }

    //initialize inventory message
    const msg = await message.channel.send('<reserved>');
    react(msg, ['◀','💸', '▶']);
    await display(client, message.author, msg, index);

    //wait for user reactions to navigate
    const filter = (reaction, user) => user === message.author;
    const collector = msg.createReactionCollector(filter, { idle: 60000 });

    collector.on('collect', async function(reaction, user) {
        reaction.users.remove(user);
        let edit = true;
        
        switch (reaction.emoji.name) {
            //previous
            case '◀':
                index = (index ? index : buybacks.length) - 1;
                break;
            
            //buy
            case '💸':
                edit = await buy(client, db, user, index, msg);
                break;

            //next
            case '▶':
                index = (index + 1) % buybacks.length;
                break;

            //other emoji
            default:
                edit = false;
                break;
        }
        if (edit) {
            index = display(client, user, msg, index);
        }
    });

    //remove message when user is done interacting
    collector.on('end', () => msg.delete());
};

//edit inventory message with new item text
function display(client, user, message, index) {
    const text = [];

    const buybacks = client.buybacks[user.id];
    if (buybacks && buybacks.length) {
        if (index >= buybacks.length) {
            index = buybacks.length - 1;
        }

        text.push(buybacks[index].toString(client, false));
        text.push('');
        text.push(`**[${index + 1}/${buybacks.length}]**`);
    }
    else {
        text.push('Sold out!');
    }

    message.edit(text);
    return index;
}

//buy item
async function buy(client, db, user, index, msg) {
    const buybacks = client.buybacks[user.id];
    if (!buybacks || !buybacks.length || index >= buybacks.length) {
        msg.edit('Something went wrong.');
        return false;
    }

    let data = await getData(db, user.id);
    if (!data.Responses || !data.Responses.GBPs || !data.Responses.GBPs.length) {
        msg.edit('Something went wrong.');
        return false;
    }

    data = data.Responses.GBPs[0];
    if (data.Inventory.length > 10 + 5 * (data.Skills.backpack || 0)) {
        msg.edit('Your inventory is full!');
        return false;
    }

    const item = buybacks[index];
    updateData(db, user, { gbps: -item.sell(), inventory: item });
    client.buybacks[user.id].splice(index, 1);

    return true;
}