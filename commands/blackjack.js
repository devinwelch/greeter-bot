const { getData, delay, updateData } = require('../utils');
const { takeBets } = require('../casino/utils');
const { Deck } = require('../casino/classes/deck');

const circle = '⭕';
const check = '✅';

module.exports = {
    name: 'blackjack',
    description: 'Play a round of blackjack at a table against greeter-bot, wagering GBPs! Single deck shuffles after every round.',
    category: 'fun',
    aliases: ['21'],
    execute(client, config, db, message, args) {
        message.channel.send('<reserved>')
        .then(msg => bet(client, config, db, msg, message.author))
        .catch(console.error);
    }
};

async function bet(client, config, db, message, leader) {
    const directions = [
        `${leader} wants to play blackjack! Everyone place your bets!`,
        'Betting over your total GBPs will bet max.',
        `${circle} Clear bet`,
        `${check} Ready up`
    ].join('\n');

    const bets = await takeBets(client, config, message, leader, directions);
    let data = await getData(db, Object.keys(bets));

    if (!data.Responses || !data.Responses.GBPs) {
        return message.edit('Something went wrong.');
    }

    data = data.Responses.GBPs;

    Object.keys(bets).forEach(id => {
        const d = data.find(d => d.UserID === id);

        if (d) {
            bets[id] = Math.max(Math.min(bets[id].amount, d.GBPs), 0);
        }
        else {
            bets[id] = 0;
        }
    });

    setup(client, config, db, message, leader, bets);
}

async function setup(client, config, db, message, leader, bets) {
    const game = { 
        deck: new Deck(),
        players: [],
        house: { 
            user: client.user,
            hand: []
        },
        turn: -1
    };

    Object.keys(bets).forEach(id => {
        game.players.push({
            user: client.users.resolve(id),
            bet: bets[id],
            hand: []
        });
    });

    for (let i = 0; i < 2; i++) {
        for(let j = 0; j < game.players.length; j++) {
            game.deck.deal(game.players[j].hand);
            await display(client, config, message, game);
        }
        game.deck.deal(game.house.hand);
        if (i) {
            game.house.hand[1].down = true;
        }
        await display(client, config, message, game);
    }

    assess(client, config, db, message, leader, game);
}

async function assess(client, config, db, message, leader, game) {
    if (getTotal(game.house.hand) === 21) {
        game.house.hand[1].down = false;
        game.players.forEach(p => {
            if (getTotal(p.hand) === 21) {
                p.bet = '±0';
            }
            else {
                updateData(db, p.user, { gbps: -p.bet });
                updateData(db, client.user, { gbps: p.bet });
                p.bet = `-${p.bet}`;
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
                p.bet = `+${win}`;
                p.finished = true;
            }
        });
    }

    await display(client, config, message, game);
    play(client, config, db, message, leader, game);
}

async function play(client, config, db, message, leader, game) {
    while (++game.turn < game.players.length) {
        if (game.players[game.turn].finished) {
            continue;
        }

        await display(client, config, message, game);
        await getTurn(client, config, message, game);
    }

    game.house.hand[1].down = false;
    await display(client, config, message, game);

    while (getTotal(game.house.hand) <= 16 && game.players.some(p => getTotal(p.hand) <= 21)) {
        game.deck.deal(game.house.hand);
        await display(client, config, message, game);
    }

    getResults(client, config, db, message, leader, game);
}

async function getResults(client, config, db, message, leader, game) {
    let win = 0;
    const house = getTotal(game.house.hand);

    game.players.filter(p => !p.finished).forEach(p => {
        const player = getTotal(p.hand);

        if (player > 21 || (house > player && house <= 21)) {
            win += p.bet;
            updateData(db, p.user, { gbps: -p.bet });
            p.bet = `-${p.bet}`;
        }
        else if (player === house) {
            p.bet = '±0';
        }
        else {
            win -= p.bet;
            updateData(db, p.user, { gbps: p.bet });
            p.bet = `+${p.bet}`;
        }
    });

    updateData(db, client.user, { gbps: win });
    await display(client, config, message, game);

    game.finished = true;

    await display(client, config, message, game);

    const filter = (reaction, user) => user === leader && (reaction.emoji.name === check || reaction.emoji.name === circle);
    const collector = message.createReactionCollector(filter, { time: 60000, max: 1 });

    let clear = true;

    collector.on('collect', (reaction, user) => {
        reaction.users.remove(user);

        if (reaction.emoji.name === check) {
            clear = false;
            bet(client, config, db, message, leader);
        }
    });

    collector.on('end', () => {
        if (clear) {
            message.reactions.removeAll();
            display(client, config, message, game, true);
        }
    });
}

async function getTurn(client, config, message, game) {
    const filter = (reaction, user) => 
        user === game.players[game.turn].user &&
        (reaction.emoji.name === check || reaction.emoji.name === circle);
    const collector = message.createReactionCollector(filter, { idle: 30000 });

    collector.on('collect', async function(reaction, user) {
        reaction.users.remove(user);

        if (reaction.emoji.name === check) {
            collector.stop();
        }
        else {
            game.deck.deal(game.players[game.turn].hand);
            if (getTotal(game.players[game.turn].hand) > 21) {
                collector.stop();
            }
        }

        await display(client, config, message, game);
    });

    return new Promise(function(resolve) {
        collector.on('end', () => resolve());
    });
}

async function display(client, config, message, game, over) {
    await delay(1500);

    const text = [];

    const players = game.players.concat(game.house);
    players.forEach(p => {
        text.push([
            `**${players[game.turn] === p ? p.user : p.user.username}** ${p.bet ? `(${p.bet} GBPs)` : ''}`,
            p.hand.map(card => card.top(client, config)).join('\t'),
            p.hand.map(card => card.bot(client, config)).join('\t'),
            ' '
        ].join('\n'));
    });

    if (game.turn >= 0 && !over) {
        if (game.finished) {
            text.push(`Play again?\t${circle} No\t${check} Yes`);
        }
        else {
            text.push(`${circle} Hit\t${check} Stand`);
        }
    }

    await message.edit(text);
}

function getTotal(hand) {
    let total;

    if (!hand.length) {
        return 0;
    }
    else {
        total = hand.map(card => card.getValue()).reduce((a, b) => a + b);
    }

    if (hand.some(card => card.rank === 1) && total < 12) {
        total += 10;
    }

    return total;
}