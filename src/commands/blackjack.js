import { delay } from '../utils/delay.js';
import { getData } from '../data/getData.js';
import { Deck } from '../casino/classes/deck.js';
import { updateData } from '../data/updateData.js';
import { databaseError } from '../utils/databaseError.js';
import { MessageActionRow, MessageButton } from 'discord.js';

export default {
    name: 'blackjack',
    description: 'Play blackjack at a table against greeter-bot',
    category: 'gbp',
    async execute(client, db, interaction) {
        begin(client, db, interaction);
    }
};

async function begin(client, db, interaction) {
    const directions = `${interaction.user.toString()} wants to play blackjack! Everyone place your bets!`;
    const chips = getChips(client);

    if (interaction.replied) {
        await interaction.editReply({ content: directions, components: chips });
    }
    else {
        await interaction.reply({ content: directions, components: chips });
    }

    interaction.messageID = (await interaction.fetchReply()).id;
    
    const bets = await takeBets(db, interaction, directions);
    const data = await getData(db, Object.keys(bets), true);
    if (!data) {
        return databaseError(interaction, 'gbp');
    }
    cleanBets(data, bets);
    const game = await setup(client, interaction, data, bets);
    await assess(client, db, interaction, game);
    await play(client, db, interaction, game);
    getResults(client, db, interaction, game);
}

function getChips(client) {
    const row1 = new MessageActionRow()
        .addComponents([
            getChipButton(client, 1),
            getChipButton(client, 5),
            getChipButton(client, 10),
            getChipButton(client, 25),
            getChipButton(client, 100),
        ]);
    const row2 = new MessageActionRow()
        .addComponents([
            getChipButton(client, 500),
            getChipButton(client, 1000),
            getPlainButton('10 MILLY', 10000000),
            getPlainButton('100 MILLY', 100000000),
            getPlainButton('1 BILLY', 1000000000),
        ]);
    const row3 = new MessageActionRow()
        .addComponents([
            getPlainButton('10 BILLY', 10000000000),
            getPlainButton('100 BILLY', 100000000000),
            getPlainButton('1 TRILLY', 1000000000000),
            getPlainButton('10 TRILLY', 10000000000000),
            getPlainButton('100 TRILLY', 100000000000000)
        ]);

    const row4 = new MessageActionRow()
        .addComponents([
            getPlainButton('1 QUADRILLY', 1000000000000000),
            getPlainButton('10 QUADRILLY', 10000000000000000),
            getPlainButton('100 QUADRILLY', 100000000000000000),
            new MessageButton()
                .setLabel('Clear')
                .setStyle('DANGER')
                .setCustomId('clear'),
            new MessageButton()
                .setLabel('Ready')
                .setStyle('SUCCESS')
                .setCustomId('ready')
        ]);

    return [row1, row2, row3, row4];

    function getChipButton(client, value) {
        return new MessageButton()
            .setEmoji(client.ids.emojis.chips['c' + value])
            .setStyle('SECONDARY')
            .setCustomId(value.toString());
    }

    function getPlainButton(text, value) {
        return new MessageButton()
            .setLabel(text)
            .setStyle('SECONDARY')
            .setCustomId(value.toString());
    }
}

function getControls(client, options) {
    return [new MessageActionRow()
        .addComponents([
            new MessageButton()
                .setEmoji(client.ids.emojis.split)
                .setLabel('Split')
                .setStyle('SECONDARY')
                .setCustomId('split')
                .setDisabled(!options.split),
            new MessageButton()
                .setEmoji(client.ids.emojis.double)
                .setLabel('Double')
                .setStyle('SECONDARY')
                .setCustomId('double')
                .setDisabled(!options.double),
            new MessageButton()
                .setEmoji('♻')
                .setLabel('Refresh')
                .setStyle('SECONDARY')
                .setCustomId('refresh'),
            new MessageButton()
                .setLabel('Hit')
                .setStyle('PRIMARY')
                .setCustomId('hit'),
            new MessageButton()
                .setLabel('Stand')
                .setStyle('SUCCESS')
                .setCustomId('stand')
        ])];
}

function getReplay() {
    return [new MessageActionRow()
        .addComponents([
            new MessageButton()
                .setLabel('No')
                .setStyle('DANGER')
                .setCustomId('no'),
            new MessageButton()
                .setLabel('Yes')
                .setStyle('SUCCESS')
                .setCustomId('yes')
        ])];
}

async function takeBets(db, interaction, directions) {
    const filter = buttonInteraction =>
        (buttonInteraction.customId === 'clear' ||
        buttonInteraction.customId === 'ready' ||
        !isNaN(buttonInteraction.customId)) &&
        buttonInteraction.message.id === interaction.messageID;

    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 120000 });

    const bets = {};
    const leader = interaction.user;
    bets[leader.id] = { name: leader.username, amount: 0, ready: false };

    await showBets(db, interaction, directions, bets);

    collector.on('collect', async buttonInteraction => {
        const user = buttonInteraction.user;

        if (buttonInteraction.customId === 'ready') {
            updateBets(null, true);

            if (Object.values(bets).every(bet => bet.ready)) {
                collector.stop();
            }
        }
        else if (buttonInteraction.customId === 'clear') {
            updateBets(0, false);
        }
        else {
            updateBets(Number(buttonInteraction.customId), null);
        }

        showBets(db, buttonInteraction, directions, bets);

        function updateBets(amount, ready) {
            if (bets[user.id]) {
                if (amount !== null) {
                    if (amount) {
                        bets[user.id].amount += amount;
                    }
                    else {
                        bets[user.id].amount = 0;
                    }
                }

                if (ready !== null) {
                    bets[user.id].ready = ready;
                }
            }
            else {
                bets[user.id] = {
                    name: user.username,
                    amount: amount || 0,
                    ready: ready
                };
            }
        }
    });

    return new Promise(function(resolve) {
        collector.on('end', () => resolve(bets));
    });

    async function showBets(db, interaction, directions, bets) {
        const data = await getData(db, Object.keys(bets), true);
        if (data) {
            data.forEach(d => bets[d.UserID].total = Math.max(0, d.GBPs));
        }

        const text = [directions];
        Object.values(bets).forEach(bet =>
            text.push(`${bet.name}: ${bet.amount.toLocaleString('en-US')}/${bet.total.toLocaleString('en-US')} ${bet.ready ? '✅' : ''}`
        ));

        const parameters = { content: text.join('\n') };
        await (interaction.isButton() ? interaction.update(parameters) : interaction.editReply(parameters));
    }
}

function cleanBets(data, bets) {
    Object.keys(bets).slice().forEach(id => {
        const d = data.find(d => d.UserID === id);

        if (d) {
            bets[id].amount = Math.max(Math.min(bets[id].amount, d.GBPs), 0);
        }
        else {
            bets[id].amount = 0;
        }
    });
}

async function setup(client, interaction, data, bets) {
    const game = { 
        deck: new Deck(4),
        players: [],
        house: { 
            user: client.user,
            hand: []
        },
        turn: -1
    };

    Object.keys(bets).forEach(userID => {
        game.players.push({
            user: client.users.resolve(userID),
            originalBet: bets[userID].amount,
            bet: bets[userID].amount,
            hand: [],
            luck: data.find(d => d.UserID === userID).Skills.luck || 0
        });
    });

    for (let i = 0; i < 2; i++) {
        for(let j = 0; j < game.players.length; j++) {
            game.deck.deal(game.players[j].hand, { luck: game.players[j].luck });
            await display(client, interaction, game);
        }
        game.deck.deal(game.house.hand, { down: i === 1 });
        await display(client, interaction, game);
    }

    return game;
}

async function display(client, interaction, game, over=false) {
    await delay(1500);

    const text = [];
    let components;
    const players = game.players.concat(game.house);
    players.forEach(p => {
        text.push([
            `**${players[game.turn] === p ? p.user : p.user.username}** ${p.bet ? `(${p.bet.toLocaleString('en-US')} GBPs)` : ''}`,
            p.hand.map(card => card.top(client)).join('\t'),
            p.hand.map(card => card.bot(client)).join('\t'),
            ' '
        ].join('\n'));
    });

    if (game.turn >= 0 && !over) {
        if (game.finished) {
            text.push('**Play again?**');
            components = getReplay();
        }
        else {
            if (game.turn < game.players.length) {
                components = getControls(client, {
                    split: game.players[game.turn].canSplit,
                    double: game.players[game.turn].canDouble 
                });
            }
        }
    }
    else {
        components = [];
    }

    const parameters = { content: text.join('\n'), components: components };
    try {
        await (interaction.isButton() ? interaction.update(parameters) : interaction.editReply(parameters));
    }
    catch { /* Discord API doesn't like multiple update()s in a row??? */ }
}

async function assess(client, db, interaction, game) {
    if (getTotal(game.house.hand) === 21) {
        game.house.hand[1].down = false;
        game.players.forEach(p => {
            if (getTotal(p.hand) === 21) {
                p.bet = '±0';
            }
            else {
                updateData(db, p.user, { gbps: -p.bet });
                updateData(db, client.user, { gbps: p.bet });
                p.bet = `-${p.bet.toLocaleString('en-US')}`;
            }
            p.finished = true;
        });
    }
    else {
        game.players.forEach(p => {
            if (getTotal(p.hand) === 21) {
                const win = Math.round(1.5 * p.bet);
                updateData(db, p.user, { gbps: win });
                updateData(db, client.user, { gbps: -win });
                p.bet = `+${win.toLocaleString('en-US')}`;
                p.finished = true;
            }
        });
    }

    await display(client, interaction, game);
}

function getTotal(hand, soft) {
    let total;

    if (!hand.length) {
        return 0;
    }
    else {
        total = hand.map(card => card.getValue()).reduce((a, b) => a + b);
    }

    if (hand.some(card => card.rank === 1) && total < 12 && !soft) {
        total += 10;
    }

    if (hand.some(card => card.rank === 0)) {
        total = 21;
    }

    return total;
}

async function play(client, db, interaction, game) {
    while (++game.turn < game.players.length) {
        if (game.players[game.turn].finished) {
            continue;
        }

        await getTurn(client, db, interaction, game);
        await delay(1000);
    }

    game.house.hand[1].down = false;
    await display(client, interaction, game);

    while (getTotal(game.house.hand) <= 16 && game.players.some(p => getTotal(p.hand) <= 21)) {
        game.deck.deal(game.house.hand);
        await display(client, interaction, game);
    }
}

async function getTurn(client, db, interaction, game) {
    const player = game.players[game.turn];
    const filter = buttonInteraction => 
        buttonInteraction.user === player.user &&
        buttonInteraction.message.id === interaction.messageID;
    const collector = interaction.channel.createMessageComponentCollector({ filter, idle: 60000 });

    await checkSplitOrDouble(db, game);
    await display(client, interaction, game);

    collector.on('collect', async buttonInteraction => {
        if (buttonInteraction.customId === 'split' && player.canSplit) {
            buttonInteraction.deferUpdate();
            const split = {};
            Object.assign(split, player);
            split.bet = split.originalBet;
            split.hand = player.hand.splice(1, 1);
            game.players.splice(game.players.indexOf(player) + 1, 0, split);

            for (let i = 0; i < 2; i++) {
                await display(client, interaction, game);
                game.deck.deal(game.players[game.turn + i].hand, { luck: player.luck });
            }

            await checkSplitOrDouble(db, game);
            await display(client, interaction, game);
        }
        else if (buttonInteraction.customId === 'double' && player.canDouble) {
            player.bet += player.originalBet;
            game.deck.deal(player.hand, { luck: player.luck });
            collector.stop();
        }
        else if (buttonInteraction.customId === 'refresh') {
            await checkSplitOrDouble(db, game);
        }
        else if (buttonInteraction.customId === 'stand') {
            collector.stop();
        }
        else if (buttonInteraction.customId === 'hit') {
            game.deck.deal(player.hand, { luck: player.luck });
            if (getTotal(player.hand) >= 21) {
                collector.stop();
            }
        }

        await display(client, buttonInteraction, game);
    });

    return new Promise(function(resolve) {
        collector.on('end', () => resolve());
    });

    async function checkSplitOrDouble(db, game) {
        const player = game.players[game.turn];
        // const hardTotal = getTotal(player.hand);
        // const softTotal = getTotal(player.hand, true);
        const data = await getData(db, player.user.id);
    
        const totalBets = game.players
            .filter(p => p.user.id === player.user.id)
            .reduce((a, b) => a + b.bet, 0);
    
        if (!data || player.hand.length !== 2 || (data.GBPs - totalBets < player.originalBet && player.originalBet > 0))
        {
            player.canDouble = false;
            player.canSplit = false;
            return;
        }
    
        player.canDouble = /*((hardTotal >= 9 && hardTotal <= 11) || (softTotal >= 9 && softTotal <= 11)) &&*/ player.originalBet;
        player.canSplit = player.hand[0].getRank() === player.hand[1].getRank();
    }
}

async function getResults(client, db, interaction, game) {
    let win = 0;
    const house = getTotal(game.house.hand);

    game.players.filter(p => !p.finished).forEach(p => {
        const player = getTotal(p.hand);

        if (player > 21 || (house > player && house <= 21)) {
            win += p.bet;
            updateData(db, p.user, { gbps: -p.bet });
            p.bet = `-${p.bet.toLocaleString('en-US')}`;
        }
        else if (player === house) {
            p.bet = '±0';
        }
        else {
            win -= p.bet;
            updateData(db, p.user, { gbps: p.bet });
            p.bet = `+${p.bet.toLocaleString('en-US')}`;
        }
    });

    updateData(db, client.user, { gbps: win });
    await display(client, interaction, game);

    game.finished = true;

    await display(client, interaction, game);

    const filter = buttonInteraction => 
        buttonInteraction.user === interaction.user && 
        buttonInteraction.message.id === interaction.messageID &&
        (buttonInteraction.customId === 'yes' || buttonInteraction.customId === 'no');
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000, max: 1 });

    let displayAgain = true;

    collector.on('collect', async buttonInteraction => {
        if (buttonInteraction.customId === 'yes') {
            displayAgain = false;
            await display(client, buttonInteraction, game, true);
            begin(client, db, interaction);
        }
    });

    collector.on('end', () => {
        if (displayAgain) {
            display(client, interaction, game, true);
        }
    });
}
