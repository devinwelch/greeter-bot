const { getData, updateData, react, delay, addToInventory, addToBuybacks } = require('../utils.js');
const { Weapon } = require('../rpg/classes/weapon');
const { Item } = require('../rpg/classes/item');
const ytdl = require('ytdl-core');

const self = module.exports = {
    name: 'inventory',
    description:
        'See and use/equip items from your inventory. Use reactions to navigate:\n' +
        '\t◀: previous item in inventory\n' +
        '\t💰: sell (see `!buyback`)\n' +
        '\t🏆: show item off!\n' +
        '\t✅: use/equip\n' +
        '\t🎁: give item to another user\n' +
        '\t▶: next item in inventory',
    category: 'rpg',
    aliases: ['i', 'use', 'equip'],
    usage: '[item name or position]'
};

self.execute = async function(client, config, db, message, args) {
    //get user data
    let data = await getData(db, message.author.id);
    if (!data.Responses || !data.Responses.GBPs || !data.Responses.GBPs.length) {
        return message.reply('Something went wrong.');
    }
    data = data.Responses.GBPs[0];

    //determine starting index
    let index = 0;
    if (args.length) {
        if (isNaN(args)) {
            const item = data.Inventory.find(item => item.type === args);
            if (item) {
                index = data.Inventory.indexOf(item);
            }
        }
        else {
            index = Math.min(args, data.Inventory.length - 1);
        }
    }

    //initialize inventory message
    const msg = await message.channel.send('<reserved>');
    react(msg, ['◀', '💰', '🏆', '✅', '🎁', '▶']);
    let result = await display(client, db, message.author, msg, index);
    
    //wait for user reactions to navigate
    const filter = (reaction, user) => user === message.author;
    const collector = msg.createReactionCollector(filter, { idle: 60000 });

    collector.on('collect', async function(reaction, user) {
        reaction.users.remove(user);
        let edit = true;
        
        switch (reaction.emoji.name) {
            //previous
            case '◀':
                index = (index ? index : result.length) - 1;
                break;
            
            //sell
            case '💰':
                if (await sell(client, db, user, result.id)) {
                    index = (index - 1) % result.length;
                }
                break;
            
            //show off
            case '🏆':
                show(msg);
                edit = false;
                break;
            
            //equip or use
            case '✅':
                if (await use(config, db, message, result.id)) {
                    index = (index + 1) % result.length;
                }
                break;

            //give
            case '🎁':
                if (!await give(client, db, user, result.id, message.channel)) {
                    edit = false;
                    collector.stop();
                }
                break;

            //next
            case '▶':
                index = (index + 1) % result.length;
                break;

            //other emoji
            default:
                edit = false;
                break;
        }
        if (edit) {
            result = await display(client, db, user, msg, index);
        }
    });

    //remove message when user is done interacting
    collector.on('end', () => msg.delete());
};

//edit inventory message with new item text, return item's id
async function display(client, db, user, message, index) {
    //get user data
    let data = await getData(db, user.id);
    if (!data.Responses ||
        !data.Responses.GBPs ||
        !data.Responses.GBPs.length ||
        !data.Responses.GBPs[0].Inventory.length)
    {
        message.edit('Something went wrong.');
        return null;
    }
    data = data.Responses.GBPs[0];

    if (index >= data.Inventory.length) {
        index = 0;
    }
    else if (index < 0) {
        index = data.Inventory.length - 1;
    }

    const item = data.Inventory[index].weapon ? new Weapon(data.Inventory[index]) : new Item(data.Inventory[index]);

    const text = [];
    text.push(item.toString(client));
    text.push('');
    text.push(`**[${index}/${data.Inventory.length - 1}]** ${data.Equipped === index ? '✅' : ''}`);

    message.edit(text);
    return { id: item.id, length: data.Inventory.length };
}

//utility to get item information
async function getItem(db, user, id) {
    const data = await getData(db, user.id);
    if (!data.Responses || !data.Responses.GBPs || !data.Responses.GBPs.length) {
        return {};
    }

    const inventory = data.Responses.GBPs[0].Inventory;
    let item = inventory.find(item => item.id === id);
    if (!item) {
        return {};
    }

    const index = inventory.indexOf(item);
    const equipped = data.Responses.GBPs[0].Equipped === index;
    item = item.weapon ? new Weapon(item) : new Item(item);
    const lvld = data.Responses.GBPs[0].Lvl >= item.lvl;

    return { id: id, item: item, index: index, equipped: equipped, lvld: lvld };
}

//sell item
async function sell(client, db, user, id) {
    const result = await getItem(db, user, id);

    //return if item not found or index 0
    if (!result.index) {
        return false;
    }

    updateData(db, user, { gbps: result.item.sell(), reequip: result.index });
    await addToBuybacks(client, user, result.item);
    await removeItem(db, user, result);

    return true;
}

//show item off
async function show(msg) {
    const arr = msg.content.split('\n');
    msg.channel.send(arr.slice(0, arr.length - 2).join('\n'));
}

//use or equip item
async function use(config, db, message, id) {
    const result = await getItem(db, message.author, id);

    //return if item not found
    if (isNaN(result.index)) {
        return;
    }

    if (result.item.weapon) {
        if (!result.equipped && result.lvld) {
            const params = {
                TableName: 'GBPs',
                Key: { 'UserID': message.author.id },
                UpdateExpression: 'Set Equipped = :e',
                ExpressionAttributeValues: { ':e': result.index }
            };
            await db.update(params, function(err) {
                if (err) {
                    console.log('Unable to update user. Error JSON:', JSON.stringify(err, null, 2));
                }
            });

            //I don't know why I need this if I'm awaiting above
            await delay(100);
        }

        return false;
    }

    await consume(config, db, message, result);
    return true;
}

//use consumable
async function consume(config, db, message, result) {
    let remove = true;
    let reply;

    switch(result.item.type) {
        case 'antidote':
            reply = 'You have been cured of coronavirus! Stay safe...';
            if (message.member.roles.cache.has(config.ids.corona)) {
                message.member.roles.remove(config.ids.corona)
                    .catch(console.error);
            }
            break;

        case 'potion':
            reply = 'Dorse protection activated.';
            message.author.dorseProtection = true;
            break;

        case 'respec':
            reply = 'Skill points returned.';
            updateData(db, message.author, { skills: {} });
            break;

        case 'pick':
            return serenade(config, db, message, result);
        
        case 'crack':
            reply = 'Shame... -10 GBPs.';
            message.member.high = true;
            updateData(db, message.author, { gbps: -10 });
            break;

        default:
            reply = "I don't know what to do with that.";
            remove = false;
    }

    message.reply(reply);

    if (remove) {
        updateData(db, message.author, { reequip: result.index });
        await removeItem(db, message.author, result);
    }
}

//give item away
async function give(client, db, user, id, channel) {
    const result = await getItem(db, user, id);

    //return if item not found or index 0
    if (!result.index) {
        return true;
    }

    const msg = await channel.send(`${user}, Who do you want to give this ${result.item.name} to? *(@ them)*`);

    const filter = message => message.author = user;
    const collector = channel.createMessageCollector(filter, { time: 60000 });

    collector.on('collect', async function(m) {
        if (m.mentions.users.size) {
            const rx = m.mentions.users.first();
            const rxData = await getData(db, rx.id);
            if (rxData.Responses && rxData.Responses.GBPs && rxData.Responses.GBPs.length) {
                if (rxData.Responses.GBPs[0].Inventory.length < 11 + 5 * (rxData.Responses.GBPs[0].Skills.backpack || 0)) {
                    updateData(db, user, { reequip: result.index });
                    addToInventory(client, db, rx, result.item);
                    removeItem(db, user, result);
                    react(m, '🦾');
                }
                else {
                    msg.edit(`${rx} has too many items!`);
                }
            }
            else {
                msg.edit(`${user}, unable to find user.`);
            }

            collector.stop();
        }
    });
}

//remove item from inventory in database
async function removeItem(db, user, result) {
    const params = {
        TableName: 'GBPs',
        Key: { 'UserID': user.id },
        UpdateExpression: `REMOVE Inventory[${result.index}]`
    };

    await db.update(params, function(err) {
        if (err) {
            console.log('Unable to remove item. Error JSON:', JSON.stringify(err, null, 2));
        }
        else {
            console.log(`Removed ${result.item.weapon ? result.item.getRarity() + ' ' : ''}${result.item.name} from ${user.username}`);
        }
    });
}

//use POD
async function serenade(config, db, message, result) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel ||
        message.client.rocking ||
        (voiceChannel.parent && voiceChannel.parent.id === config.ids.foil)) 
    {
        return;
    }

    await message.reply('What song? Send a YouTube link.');

    const filter = msg => msg.author = message.author;
    const collector = message.channel.createMessageCollector(filter, { time: 60000, max: 1 });

    collector.on('collect', async function(msg) {
        if (voiceChannel &&
            !message.client.rocking &&
            ytdl.validateURL(msg.content) &&
            (!voiceChannel.parent || voiceChannel.parent.id !== config.ids.foil))
        {
            message.client.rocking = true;

            voiceChannel.join()
            .then(connection => {
                const stream = ytdl(msg.content, { filter: 'audioonly' });
                const dispatcher = connection.play(stream, { volume: 0.3 });
                dispatcher.on('start', () => {
                    setTimeout(() => dispatcher.end(), 600000);
                });
                dispatcher.on('finish', () => {
                    voiceChannel.leave();
                    message.client.rocking = false;
                });
            })
            .catch(console.error);

            msg.delete()
            .then(msg => console.log(`${msg.author.username} rocked out to ${msg.content}`))
            .catch(console.error);

            result = await getItem(db, message.author, result.id);
            updateData(db, message.author, { reequip: result.index });
            removeItem(db, message.author, result);
        }
    });
}