import { react } from '../utils/react.js';
import { delay } from '../utils/delay.js';
import { getData } from '../data/getData.js';
import { Item } from '../rpg/classes/item.js';
import { Weapon } from '../rpg/classes/weapon.js';
import { updateData } from '../data/updateData.js';
import { playYouTube } from '../sound/playYouTube.js';
import { getVoiceConnection } from '@discordjs/voice';
import { addToBuybacks } from '../rpg/addToBuybacks.js';
import { databaseError } from '../utils/databaseError.js';
import { addToInventory } from '../rpg/addToInventory.js';
import { MessageActionRow, MessageButton } from 'discord.js';

export default {
    name: 'inventory',
    description: 'See and use items in your inventory',
    category: 'rpg',
    options: [{
        type: 3, //STRING
        name: 'item',
        description: 'Item name',
        required: false
    }],
    async execute(client, db, interaction) {
        //get user data
        const data = await getData(db, interaction.user.id);
        if (!data) {
            return databaseError(interaction, 'inventory');
        }

        //determine starting index
        let index = 0;
        const itemName = interaction.options.getString('item');
        if (itemName) {
            const item = data.Inventory.find(i => i.type === itemName);
            if (item) {
                index = data.Inventory.indexOf(item);
            }
        }

        //show inventory
        let itemID = await display(client, db, interaction, index, true);
        interaction.messageID = (await interaction.fetchReply()).id;

        //respond to interaction with UI
        const filter = buttonInteraction => buttonInteraction.message.id === interaction.messageID && buttonInteraction.user === interaction.user;
        const collector = interaction.channel.createMessageComponentCollector({ filter, idle: 60000 });

        collector.on('collect', async buttonInteraction => {
            switch (buttonInteraction.customId) {
                //previous
                case 'previous':
                    index -= 1;
                    break;

                //next
                case 'next':
                    index += 1;
                    break;
                
                //equip or use
                case 'use':
                    await use(client, db, interaction, itemID);
                    break;
    
                //give
                case 'give':
                    if (!await give(client, db, interaction, itemID)) {
                        collector.stop();
                    }
                    break;
                
                //sell
                case 'sell':
                    await sell(client, db, interaction.user, itemID);
                    break;
                
                //show off
                case 'show':
                    show(interaction);
                    break;
    
                //other emoji
                default:
                    break;
            }
            
            itemID = await display(client, db, buttonInteraction, index);
        });
    
        //remove message when user is done interacting
        collector.on('end', async () => {
            const message = await interaction.fetchReply();
            message.delete();
        });
    }
};

async function display(client, db, interaction, index, initial=false) {
    const data = await getData(db, interaction.user.id);
    if (!data) {
        databaseError(interaction, 'inventory');
        return null;
    }

    index = index % data.Inventory.length;
    if (index < 0) {
        index += data.Inventory.length;
    }
    const i = data.Inventory[index];
    const item = i.weapon ? new Weapon(null, i) : new Item(i);
    let text = [];
    text.push(item.toString(client));
    text.push('');
    text.push(`**[${index}/${data.Inventory.length - 1}]** ${data.Equipped === index ? '✅' : ''}`);
    text = text.join('\n');

    try {
        if (initial) {
            await interaction.reply({ content: text, components: getButtons() });
        }
        await (interaction.isButton() ? interaction.update(text) : interaction.editReply(text));
    }
    catch {
        //oh well
    }
    
    return item.id;
}

function getButtons() {
    return [
        new MessageActionRow()
            .addComponents([
                getButton('Previous', '◀', 'PRIMARY', 'previous'),
                getButton('Use', '✅', 'SUCCESS', 'use'),
                getButton('Next', '▶', 'PRIMARY', 'next')
            ]),
        new MessageActionRow()
            .addComponents([
                getButton('Give', '🎁', 'SECONDARY', 'give'),
                getButton('Sell', '💰', 'DANGER', 'sell'),
                getButton('Show off!', '🏆', 'SECONDARY', 'show')
        ])];

    function getButton(label, emoji, style, id) {
        return new MessageButton()
            .setLabel(label)
            .setEmoji(emoji)
            .setStyle(style)
            .setCustomId(id);
    }
}

//get item info
async function getItem(db, userID, itemID) {
    const data = await getData(db, userID);
    if (!data) {
        return {};
    }

    let item = data.Inventory.find(i => i.id === itemID);
    if (!item) {
        return {};
    }

    const index = data.Inventory.indexOf(item);
    const equipped = data.Equipped === index;
    item = item.weapon ? new Weapon(null, item) : new Item(item);
    const lvld = data.Lvl >= item.lvl;

    return { id: itemID, item: item, index: index, equipped: equipped, lvld: lvld };
}

//sell item
async function sell(client, db, user, itemID) {
    const result = await getItem(db, user.id, itemID);

    //return if item not found or index 0
    if (!result.index) {
        return false;
    }

    updateData(db, user, { gbps: result.item.sell(), reequip: result.index });
    addToBuybacks(client, user, result.item);
    await removeItem(db, user, result);
}

//show item off
async function show(interaction) {
    const message = await interaction.fetchReply();
    const arr = message.content.split('\n');
    interaction.followUp(arr.slice(0, arr.length - 2).join('\n'));
}

//use or equip item
async function use(client, db, interaction, itemID) {
    const result = await getItem(db, interaction.user.id, itemID);

    //return if item not found
    if (isNaN(result.index)) {
        return;
    }

    if (result.item.weapon) {
        if (!result.equipped && result.lvld) {
            const params = {
                TableName: 'GBPs',
                Key: { 'UserID': interaction.user.id },
                UpdateExpression: 'Set Equipped = :e',
                ExpressionAttributeValues: { ':e': result.index }
            };
            //need to await update, so not using updateData()
            await db.update(params, function(err) {
                if (err) {
                    console.log('Unable to update user. Error JSON:', JSON.stringify(err, null, 2));
                }
            });

            //I don't know why I need this if I'm awaiting above
            await delay(100);
        }
    }
    else {
        await consume(client, db, interaction, result);
    }
}

//use consumable
async function consume(client, db, interaction, result) {
    let remove = true;
    let reply;

    switch(result.item.type) {
        case 'antidote':
        case 'vaccine':
            reply = 'You have been cured of coronavirus! Stay safe...';
            if (interaction.member.roles.cache.has(client.ids.roles.corona)) {
                interaction.member.roles.remove(client.ids.roles.corona)
                    .catch(console.error);
            }
            break;

        case 'potion':
            reply = 'Dorse protection activated.';
            interaction.user.dorseProtection = true;
            break;

        case 'respec':
            reply = 'Skill points returned.';
            updateData(db, interaction.user, { skills: {} });
            break;

        case 'pick':
            remove = false;
            return await serenade(client, db, interaction, result);
        
        case 'crack':
            reply = 'Shameful...';
            interaction.member.high = true;
            break;

        default:
            reply = "I don't know what to do with that.";
            remove = false;
    }

    interaction.followUp(reply);

    if (remove) {
        updateData(db, interaction.user, { reequip: result.index });
        await removeItem(db, interaction.user, result);
    }
}

//give item away
async function give(client, db, interaction, itemID) {
    const result = await getItem(db, interaction.user.id, itemID);

    //return if item not found or index 0
    if (!result.index) {
        return true;
    }

    const message = await interaction.followUp(`${interaction.user}, Who do you want to give this ${result.item.name} to? *(@ them)*`);

    const filter = message => message.author = interaction.user;
    const collector = interaction.channel.createMessageCollector(filter, { time: 60000 });

    collector.on('collect', async function(m) {
        if (m.mentions.users.size) {
            const rx = m.mentions.users.first();
            const rxData = await getData(db, rx.id);
            if (rxData) {
                if (rxData.Inventory.length < 11 + 5 * (rxData.Skills.backpack || 0)) {
                    updateData(db, interaction.user, { reequip: result.index });
                    addToInventory(client, db, rx, result.item);
                    removeItem(db, interaction.user, result);
                    react(m, '🦾');
                }
                else {
                    message.edit(`${rx} has too many items!`);
                }
            }
            else {
                message.edit(`${interaction.user}, unable to find user.`);
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

    //need to await
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
async function serenade(client, db, interaction, result) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel ||
        getVoiceConnection(interaction.guild.id) ||
        voiceChannel.parent?.id === client.ids.channels.foil) 
    {
        return;
    }

    await interaction.followUp({ content: 'What song? Send a YouTube link.', ephemeral: true });

    const filter = message => message.author = interaction.user;
    const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });

    collector.on('collect', async message => {
        console.log(message.content);

        if (playYouTube(client, voiceChannel, message.content, { rocking: true, volume: 0.3, timeout: 600000 })) {
            try {
                console.log(`${interaction.user.username} rocked out to ${message.content}`);
                result = await getItem(db, interaction.user.id, result.id);
                updateData(db, interaction.user, { reequip: result.index });
                removeItem(db, interaction.user, result);
                await message.delete();
            }
            catch (error) {
                console.error(error);
            }
        }
    });

    return new Promise(() => {
        collector.on('end', () => {});
    });
}