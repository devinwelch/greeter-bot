import { v4 } from 'uuid'; 
import { pad } from '../utils/pad.js';
import items from '../rpg/data/items.js';
import { getData } from '../data/getData.js';
import { getRandom } from '../utils/random.js';
import { updateData } from '../data/updateData.js';
import { getCoinData } from '../data/getCoinData.js';
import { inventoryFull } from '../rpg/addToInventory.js';
import { databaseError } from '../utils/databaseError.js';
import { MessageActionRow, MessageButton, MessageSelectMenu } from 'discord.js';

export default {
    name: 'shop',
    description: 'Spend your hard-earned GBPs',
    category: 'rpg',
    options: [{
        type: 4, //INTEGER
        name: 'quantity',
        description: 'Quantity of item',
        required: false
    },
    {
        type: 3, //STRING
        name: 'item',
        description: 'Name of item',
        required: false,
        choices: [
            { name: 'Vaccine', value: 'vaccine' },
            { name: 'Potion', value: 'potion' },
            { name: 'Respec', value: 'respec' },
            { name: 'Crack', value: 'crack' },
            { name: 'Coin', value: 'coin' },
        ],
    }],
    async execute(client, db, interaction) {
        //get right into purchase without menu
        const item = interaction.options.getString('item');
        if (item) {
            const quantity = interaction.options.getInteger('quantity') || 1;
            const result = await buy(client, db, interaction.user, item, quantity);

            if (result.error) {
                return databaseError(interaction, 'result.error');
            }

            return interaction.reply(result);
        }
        
        //current state of shop
        let shop = true, index = 0, selected = null, display = true, extra;

        //display shop
        const message = await getMessage(client, db, interaction.user.id, shop, index);
        if (message.error) {
            return databaseError(interaction, message.error);
        }

        await interaction.reply(message);
        interaction.message = await interaction.fetchReply();

        //setup collector
        const filter = componentInteraction => 
            componentInteraction.message === interaction.message &&
            componentInteraction.user === interaction.user;

        const collector = interaction.channel.createMessageComponentCollector({ filter, idle: 60000 });

        collector.on('collect', async componentInteraction => {
            //temporarily store item choice
            if (componentInteraction.isSelectMenu()) {
                selected = componentInteraction.values[0];
                componentInteraction.deferUpdate();
                display = false;
            }
            //buy item from shop
            else if (componentInteraction.customId === 'shop') {
                extra = await buy(client, db, interaction.user, selected);
                if (extra.error) {
                    collector.end();
                }
            }
            //buy back item
            else if (componentInteraction.customId === 'buyback') {
                extra = await buyback(client, db, interaction.user, index);
                if (extra.error) {
                    collector.end();
                }
            }
            //scroll through buybacks
            else if (componentInteraction.customId === 'next') {
                index++;
                if (index >= client.buybacks[interaction.user.id]?.length) {
                    index = 0;
                }
            }
            //scroll back through buybacks
            else if (componentInteraction.customId === 'back') {
                index--;
                if (index < 0) {
                    index = (client.buybacks[interaction.user.id]?.length ?? 1) - 1;
                }
            }
            //toggle main shop and buybacks
            else {
                shop = !shop;
            }

            //display update message
            if (display) {
                componentInteraction.update(await getMessage(client, db, interaction.user.id, shop, index, extra));
            }
            //reset state
            else {
                display = true;
            }
            extra = null;
        });

        //delete message on idle timeout
        collector.on('end', () => {
            interaction.message.delete();
            process.on('unhandledRejection', () => {});
        });
    }
};

async function getMessage(client, db, userID, shop, index, extra) {
    const coin = await getCoinCost(db);
    if (coin.error) {
        return coin;
    }

    const ticket = await getTicketCost(db, userID);
    if (ticket.error) {
        return ticket;
    }

    return {
        content: getContent(client, userID, shop, index, coin, ticket, extra),
        components: getComponents(shop)
    };

}

async function getCoinCost(db) {
    const coinData = await getCoinData(db);
    if (coinData) {
        return coinData[coinData.length - 1];
    }

    return { error: 'Coin' };
}

async function getTicketCost(db, userID) {
    const gbpData = await getData(db, userID);
    if (gbpData) {
        return 10 ** gbpData.Tickets.length;
    }

    return { error: 'GBP' };
}

function getContent(client, userID, shop, index, coin, ticket, extra) {
    return shop 
        ? getShop(coin, ticket, extra)
        : getBuybacks(client, userID, index, extra);
}

function getShop(coin, ticket, extra) {
    const shop = [
        '```',
        'Item\t\t\tCost\t\tDescription',
        '----\t\t\t----\t\t-----------'
    ];
    
    getPurchasable().forEach(i => {
        let cost = i.cost;
        if (cost === '???') {
            switch (i.type) {
                case 'coin': cost = coin; break;
                case 'ticket': cost = ticket; break;
            }
        }

        shop.push(`•${pad(i.name, 15)}${pad(cost, 6)}GBPs  ${i.description}`);
    });
    shop.push('```');

    if (extra) {
        shop.push(`**${extra}**`);
    }

    return shop.join('\n'); 
}

function getBuybacks(client, userID, index, extra) {
    const text = [];

    const buybacks = client.buybacks[userID];
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

    if (extra) {
        text.push(`\n**${extra}**`);
    }

    return text.join('\n');
}

function getComponents(shop) {
    const components = [];

    if (shop) {
        components.push(new MessageActionRow()
            .addComponents([
                new MessageSelectMenu()
                    .setCustomId('menu')
                    .addOptions(
                        getPurchasable().map(item => {
                            return {
                                label: item.name,
                                value: item.type
                            };
                        })
                    )

            ])
        );

        components.push(new MessageActionRow()
            .addComponents([
                new MessageButton()
                    .setCustomId('switch')
                    .setLabel('Buybacks')
                    .setStyle('PRIMARY')
                    .setEmoji('🔀'),
                new MessageButton()
                    .setCustomId('shop')
                    .setLabel('Buy')
                    .setStyle('SUCCESS')
                    .setEmoji('💸')
            ])
        );
    }
    else {
        components.push(new MessageActionRow()
            .addComponents([
                new MessageButton()
                    .setCustomId('back')
                    .setStyle('SECONDARY')
                    .setEmoji('◀'),
                new MessageButton()
                    .setCustomId('switch')
                    .setLabel('Main Shop')
                    .setStyle('PRIMARY')
                    .setEmoji('🔀'),
                new MessageButton()
                    .setCustomId('buyback')
                    .setLabel('Buy')
                    .setStyle('SUCCESS')
                    .setEmoji('💸'),
                new MessageButton()
                    .setCustomId('next')
                    .setStyle('SECONDARY')
                    .setEmoji('▶')
            ])
        );
    }

    return components;
}

function getPurchasable() {
    return Object.values(items).filter(i => i.cost && !i.hide && !i.weapon);
}

async function buy(client, db, user, item, quantity=1) {
    if (quantity < 1) {
        return 'Please purchase something!';
    }

    const data = await getData(db, user.id);
    if (!data) {
        return { error: 'GBP' };
    }

    if (inventoryFull(data, item)) {
        return 'Your inventory is full!';
    }

    const coin = await getCoinCost(db);
    if (coin.error) {
        return coin;
    }

    const ticket = await getTicketCost(db, user.id);
    if (ticket.error) {
        return ticket;
    }

    if (item === 'ticket' || item === 'pass') {
        quantity = 1;
    }

    const cost = 
        item === 'coin' ? coin :
        item === 'ticket' ? ticket :
        items[item].cost; 

    const total = cost * quantity;

    if (data.GBPs < total) {
        return "You can't afford this!";
    }

    const params = { gbps: -total };
    if (item === 'lootbox') {
        params.boxes = quantity;
    }
    else if (item === 'coin') {
        params.coins = quantity;
    }
    else if (item === 'ticket') {
        params.tickets = [getRandom(1, 20), getRandom(1, 20), getRandom(1, 20)];
    }
    else if (item === 'pass') {
        //TODO assign role;
    }
    else {
        params.inventory = [];
        for (let i = 0; i < quantity; i++) {
            params.inventory.push({ type: item, id: v4() });
        }
    }
    
    updateData(db, user, params);
    return `Thank you for purchasing: ${quantity}x ${item}`;
}

async function buyback(client, db, user, index) {
    const buybacks = client.buybacks[user.id];
    if (!buybacks || !buybacks.length || index >= buybacks.length) {
        return 'Could not complete purchase';
    }

    const data = await getData(db, user.id);
    if (!data) {
        return { error: 'GBP' };
    }

    const item = buybacks[index];

    if (inventoryFull(data, item.type)) {
        return 'Your inventory is full!';
    }

    updateData(db, user, { gbps: -item.sell(), inventory: item });
    client.buybacks[user.id].splice(index, 1);

    return 'Purchase Successful';
}