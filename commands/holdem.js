const { getData, delay, updateData } = require('../utils');
const { findBest, takeBets, circle, check } = require('../casino/utils');
const { Deck } = require('../casino/classes/deck');

module.exports = {
    name: 'holdem',
    description: "Play Casino Hold'em against greeter-bot, wagering GBPs. Enter with an ante then choose to fold or call (for 2x ante) after the flop." +
        '\nPayout: RF-100:1, SF-20:1, 4oaK-10:1, FH-3:1, Flush-2:1, Other-1:1 ante bet; call bet pays 1:1 if house qualifies (pair of 4s+)',
    category: 'fun',
    aliases: ['poker'],
    execute(client, config, db, message, args) {
        return message.reply('A recent Discord API change broke me and caused a huge bug, so this table is closed until further notice :(.'); //BUG

        message.channel.send('<reserved>')
        .then(msg => bet(client, config, db, msg, message.author))
        .catch(console.error);
    }
};

async function bet(client, config, db, message, leader) {
    const directions = [
        `${leader} wants to play hold'em! Everyone ante up!`,
        'Max ante is 1/3 your total GBPs.',
        `${circle} Clear ante`,
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
            bets[id] = Math.max(Math.min(bets[id].amount, Math.floor(d.GBPs / 3)), 0);
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
        community: [],
        turn: -1
    };

    Object.keys(bets).forEach(id => {
        game.players.push({
            user: client.users.resolve(id),
            ante: bets[id],
            call: 0,
            bet: bets[id],
            hand: []
        });
    });

    //hole
    for (let i = 0; i < 2; i++) {
        for(let j = 0; j < game.players.length; j++) {
            game.deck.deal(game.players[j].hand);
            await display(client, config, message, game);
        }
        game.deck.deal(game.house.hand, { down: true });
        await display(client, config, message, game);
    }

    //flop
    for (let i = 0; i < 3; i++) {
        game.deck.deal(game.community);
        await display(client, config, message, game);
    }

    play(client, config, db, message, leader, game);
}

async function play(client, config, db, message, leader, game) {
    //call or fold
    while (++game.turn < game.players.length) {
        await display(client, config, message, game);
        await getTurn(client, db, config, message, game);
    }

    //4th and 5th street
    for (let i = 1; i <= 2; i++) {
        game.deck.deal(game.community);
        await delay(1500 * i);
        await display(client, config, message, game);
    }

    //dealer
    for (let i = 0; i < 2; i++) {
        game.house.hand[i].down = false;
        await delay(2000).then(() => display(client, config, message, game));
    }

    getResults(client, config, db, message, leader, game);
}

async function getTurn(client, db, config, message, game) {
    const player = game.players[game.turn];

    const filter = (reaction, user) => 
        user === player.user &&
        (reaction.emoji.name === check || reaction.emoji.name === circle);
    const collector = message.createReactionCollector(filter, { max: 1, idle: 60000 });

    collector.on('collect', async function(reaction, user) {
        reaction.users.remove(user);

        if (reaction.emoji.name === circle) {
            player.folded = true;

            updateData(db, player.user, { gbps: -player.ante });
            updateData(db, client.user, { gbps: player.ante });
            player.bet = `-${player.ante}`;
        }
        else {
            player.call = 2 * player.ante;
            player.bet = player.ante + player.call;
        }

        await display(client, config, message, game);
    });

    return new Promise(function(resolve) {
        collector.on('end', () => resolve());
    });
}

async function getResults(client, config, db, message, leader, game) {
    let houseWin = 0;
    const house = findBest(game.house.hand, game.community).value;
    const qualified = house[0] > 1 || (house[0] === 1 && house[1] > 3);

    game.players.filter(p => !p.folded).forEach(p => {
        const player = findBest(p.hand, game.community).value;

        for (let i = 0; i < house.length; i++) {
            if (house[i] > player[i]) {
                houseWin += p.bet;
                updateData(db, p.user, { gbps: -p.bet });
                p.bet = `-${p.bet}`;
                break;
            }
            else if (house[i] < player[i]) {
                const multiplier = 
                    player[0] === 9 ? 100 :
                    player[0] === 8 ? 20 :
                    player[0] === 7 ? 10 :
                    player[0] === 6 ? 3 :
                    player[0] === 5 ? 2 : 1;

                let playerWin = multiplier * p.ante;
                if (qualified) {
                    playerWin += p.call;
                }
                houseWin -= playerWin;
                updateData(db, p.user, { gbps: playerWin });
                p.bet = `+${playerWin}`;
                break;
            }
            else if (house[i] === player[i] && i + 1 === house.length) {
                p.bet = '±0';
                break;
            }
        }
    });

    updateData(db, client.user, { gbps: houseWin });
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

async function display(client, config, message, game, over) {
    await delay(1500);

    const text = [];

    game.players.concat(game.house).forEach(p => {
        text.push([
            `**${game.players[game.turn] === p ? p.user : p.user.username}** ${p.bet ? `(${p.bet} GBPs)` : ''}`,
            p.hand.map(card => card.top(client, config)).join('\t'),
            p.hand.map(card => card.bot(client, config)).join('\t'),
            p.hand.every(card => !card.down) && game.community.length > 2 ? findBest(p.hand, game.community).name : '',
            ''
        ].join('\n'));
    });

    text.push([
        '**Community**',
        game.community.map(card => card.top(client, config)).join('\t'),
        game.community.map(card => card.bot(client, config)).join('\t')
    ].join('\n'));

    if (game.turn >= 0 && !over) {
        if (game.finished) {
            text.push(`Play again?\t${circle} No\t${check} Yes`);
        }
        else {
            text.push('\nCall or fold? (call = additional 2x ante bet)');
            text.push(`${circle} Fold\t${check} Call`);
        }
    }

    await message.edit(text);
}