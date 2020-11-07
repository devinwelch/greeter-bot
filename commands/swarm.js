const { getRandom, getChance, selectRandom, assembleParty, shuffle, format, react, delay, updateData } = require('../utils');
const { aim } = require('../rpg/aim');
const { Action } = require('../rpg/classes/action');
const { Board } = require('../rpg/classes/board');
const { Human } = require('../rpg/classes/human');
const { Enemy } = require('../rpg/classes/enemy');
const { Bananas, Wall } = require('../rpg/classes/nonplayer');
const { astar } = require('../rpg/astar');
const { once } = require('events');

const emojis = ['⬅️', '⬆️', '⬇️', '➡️', '⚔', '🧰', '🛑'];
let count;

//TODO:
//enemies can execute
//randomize weapons for clones
    //choice?
//save functionality
//enemy sounds

module.exports = {
    name: 'swarm',
    description: 'Team up with up to 8 players, defending your fort from never-ending waves of monsters!',
    category: 'rpg',
    aliases: ['invasion', 'defense'],
    usage: '[# of characters per player (1-4)]',
    execute(client, config, db, message, args) {
        //send invite
        const invite = [];
        invite.push(`Join ${message.member.displayName} in the fray as you defend your banana hoard from a swarm of monsters!`);
        invite.push(`React with ${client.emojis.resolve(config.ids.yeehaw)} to join the party.`);
        invite.push(`Leader, react with ${client.emojis.resolve(config.ids.sanic)} to get started!`);

        assembleParty(client, config, db, message.channel, message.author, invite, 0)
        .then(results => {
            let amount = Math.min(4, Math.max(1, isNaN(args) ? 1 : args));

            if (!results) {
                return;
            }

            while(amount * results.party.length > 8) {
                amount--;
            }

            if (amount) {
                setTimeout(() => results.msg.delete(), 2000);

                const party = [];
                for (let i = 0; i < amount; i++) {
                    results.party.forEach(player => party.push(player));
                }
                setup(client, db, message.guild, message.channel, party, results.data.Responses.GBPs);
            }
            else {
                return message.reply("There's a maximum of 8 players per battle, sorry!");
            }
        });
    }
};

function setup(client, db, guild, channel, party, data) {
    let position = 0;
    const combatants = [];

    shuffle(party).forEach(user => {
        const userData = data.find(d => d.UserID === user.id);
        const member = guild.members.resolve(user);
        const human = new Human(member, userData);
        human.wood = 2;
        human.position = position++;
        human.weapon.slow = false;
        combatants.push(human);
    });

    const bananas = new Bananas(500 + Math.sqrt(data.reduce((a, b) => a + Math.max(0, b.GBPs), 0)));
    const board = new Board(combatants, bananas);
    start(client, db, channel, [bananas].concat(combatants), board);
}

async function start(client, db, channel, party, board) {
    //break into 2 messages to circumvent character limit
    const header = await channel.send('<reserved>');
    const map = await channel.send('<reserved>');

    count = 0;

    react(map, emojis);
    await display(client, db, party, board, [], 0, header, map);

    fight(client, db, party, board, header, map);
}

async function fight(client, db, party, board, header, map) {
    let actions = [], turn = -1, round = -3, wave = 0;
    const humans = party.filter(p => p.human);
    const min = humans.length + 1;
    const perimeter = board.getPerimeter();

    while(party[0].hp > 0 && party.filter(p => p.human).some(h => h.hp > 0)) {
        turn = ++turn % party.length;

        if (!turn) {
            continue;
        }

        if (party[turn].hp > 0) {
            if (party[turn].human) {
                await getPlayerTurn(client, db, party, board, actions, turn, header, map);
            }
            else {
                await getAITurn(client, db, party, board, actions, turn, header, map);
            }
        }

        if (turn === party.length - 1) {
            round++;

            if (round % 10 === 0) {
                //new wave
                wave++;
                actions.push(new Action(`** Wave ${wave} begins!**`));

                const max = min + Math.round(Math.log(wave));
                const size = getRandom(min, max);
                //1-99; 10% of avg lvl * wave #
                const lvl = Math.max(Math.min(99, Math.round((wave * 0.1 * humans.reduce((a, b) => a + b.lvl, 0) / humans.length))), 1);

                for (let i = 0; i < size; i++) {
                    let openings = perimeter.filter(tile => !tile.occupied);

                    if (!openings.length) {
                        openings = openings.concat(perimeter.filter(tile => tile.occupied.wall));
                    }

                    if (!openings.length) {
                        break;
                    }

                    const spawn = selectRandom(openings);
                    const enemy = new Enemy(lvl, { ban: true });
                    enemy.opponents = humans;
                    enemy.icon = enemy.creature.emoji;
                    spawn.toFighter(enemy);

                    enemy.x = spawn.x;
                    enemy.y = spawn.y;
                    enemy.position = party.length;

                    party.push(enemy);
                }
            }

            if (round % 7 === 0) {
                board.getRandomTile().icon = getChance(75) ? '💊' : '💰';
            }

            await display(client, db, party, board, actions, turn, header, map);
            await delay(1000);
        }
    }

    board.stats.waves = wave;
    getResults(client, db, party, board, actions, header, map);
}

async function getPlayerTurn(client, db, party, board, actions, turn, header, map) {
    const turnPlayer = party[turn];
    turnPlayer.steps = 4;
    let direction, action;

    await display(client, db, party, board, actions, turn, null, map, { steps: turnPlayer.steps });

    const filter = (reaction, user) => user === turnPlayer.member.user && emojis.includes(reaction.emoji.name);
    const collector = map.createReactionCollector(filter, { idle: 60000 });

    collector.on('collect', async function(reaction) {
        let refreshMap = true, refreshHeader = false;

        //move & aim
        if (['⬅️', '⬆️', '⬇️', '➡️'].includes(reaction.emoji.name)) {
            //aiming weapon or toolbox
            if (action) {
                //attack
                if (action === '⚔') {
                    aim(turnPlayer, board, reaction.emoji.name);
                    direction = reaction.emoji.name;
                }

                //toolbox
                else if (action === '🧰') {
                    if (act(client, party, board, actions, turn, action, reaction.emoji.name)) {
                        direction = false;
                        collector.stop();
                    }
                }
            }

            //moving player
            else if (turnPlayer.steps) {
                let x = 0;
                let y = 0;

                switch (reaction.emoji.name) {
                    case '⬅️': x = -1; break;
                    case '⬆️': y = -1; break;
                    case '⬇️': y =  1; break;
                    case '➡️': x =  1; break;
                }

                x += turnPlayer.x;
                y += turnPlayer.y;

                if (x > 0 && x <= board.width && y > 0 && y <= board.height && !board[x][y].occupied) {
                    const move = board.moveFighter(board[x][y], board[turnPlayer.x][turnPlayer.y]);

                    if (move) {
                        switch (move.type) {
                            case '💊':
                                actions.push(new Action(`${turnPlayer.name} healed ${Math.round(move.amount)} HP!`));
                                refreshHeader = true;
                                break;
                            case '🌿':
                                actions.push(new Action(`${turnPlayer.name} picked up sticks!`));
                                break;
                            case '💰':
                                actions.push(new Action(`${turnPlayer.name} found ${move.amount} GBPs!`));
                                updateData(db, turnPlayer.member.user, { gbps: move.amount });
                        }
                    }

                    turnPlayer.steps--;
                }
            }
        }

        //attack
        else if (reaction.emoji.name === '⚔') {
            //lock in
            if (direction) {
                act(client, party, board, actions, turn, action, direction);
                refreshHeader = true;
                direction = false;
                collector.stop();
            }

            //start aiming
            else {
                turnPlayer.steps = 0;
                action = '⚔';
            }
        }

        //chop/build/revive/repair
        else if (reaction.emoji.name === '🧰') {
            turnPlayer.steps = 0;
            action = '🧰';
        }

        //end turn
        else if (reaction.emoji.name === '🛑') {
            refreshMap = false;
            direction = false;
            collector.stop();
        }

        if (refreshMap) {
            const verb = 
                action === '⚔'  ? 'attack' :
                action === '🧰' ? 'chop/build/repair/revive' : null;
            await display(client, db, party, board, actions, turn, refreshHeader ? header : null, map, { verb: verb });
            board.clearTemp();
        }
    });

    await once(collector, 'end');
    board.clearTemp();
    await display(client, db, party, board, actions, null, null, map);
}

function act(client, party, board, actions, turn, action, direction) {
    const turnPlayer = party[turn];
    let complete = false, targets = [];
    const options = { named: true, skip: true, tres: true };

    if (action === '🧰') {
        let x = turnPlayer.x;
        let y = turnPlayer.y;

        if (direction === '⬅️') x--;
        else if (direction === '➡️') x++;
        else if (direction === '⬆️') y--;
        else if (direction === '⬇️') y++;

        if (x >= 1 && y >= 1 && x <= board.width && y <= board.height) {
            const target = board[x][y];

            if (!target.occupied && turnPlayer.wood > 0) {
                actions.push(new Action(`${turnPlayer.name} built a wall!`, turn, party));
                target.toFighter(new Wall(50));
                turnPlayer.wood--;
                complete = true;
            }
            else if (target.occupied.bananas && turnPlayer.wood > 0) {
                actions.push(new Action(`${turnPlayer.name} repaired ${target.occupied.name}!`, turn, party));
                target.occupied.hp = Math.min(target.occupied.max, target.occupied.hp + 30);
                turnPlayer.wood--;
                complete = true;
            }
            else if (target.occupied.tree || target.occupied.wall) {
                actions.push(new Action(`${turnPlayer.name} chopped ${target.occupied.name} down!`, turn, party));
                target.toStick();
                complete = true;
            }
            else if (target.occupied.human && target.occupied.hp <= 0) {
                target.occupied.hp = target.occupied.max / 2;
                actions.push(new Action(`${turnPlayer.name} revived ${target.occupied.name}!`, turn, party));
                complete = true;
            }
        }
    }
    else {
        const results = aim(turnPlayer, board, direction);
        board.clearTemp();
        targets = results.targets || results;

        if (results.options) {
            Object.assign(options, results.options);
        }

        options.skip = false;
        complete = true;
    }

    const turnActions = turnPlayer.getTurn(client, party, targets, options);
    turnActions.forEach(t => actions.push(t));

    return complete;
}

async function getAITurn(client, db, party, board, actions, turn, header, map) {
    await display(client, db, party, board, actions, turn, null, map);

    const enemy = party[turn];
    const graph = board.getGraph();
    const start = graph.grid[enemy.x][enemy.y];
    const options = [];

    //check viability of movement towards various squares in grid
    party.filter(p => p.human || p.bananas).forEach(p => {
        board.getSurrounding(p.x, p.y).forEach(tile => {
            if (tile.getWeight() || tile.occupied == enemy) {
                //see how many players surround this space
                const surroundingFighters = board.getSurrounding(tile.x, tile.y)
                    .filter(tile => tile.occupied.human || tile.occupied.bananas)
                .map(tile => tile.occupied)
                .filter(f => f.hp > 0);
            
                const end = graph.grid[tile.x][tile.y];
                const path = astar.search(graph, start, end);

                if (path.length) {
                    //determine desire to reach space (lower number = more desirable):
                    //  base initial desire on amount of steps to reach target
                    //  prioritize attacks on multiple targets
                    let desire = path.reduce((a, b) => a + b.weight, 0);
                    desire /= surroundingFighters.length;
                    options.push({ path: path, desire: desire });
                }
            }
        });
    });

    //should I stay or should I go?
    const surroundingFighters = board.getSurrounding(enemy.x, enemy.y)
        .filter(t => t.occupied.human || t.occupied.bananas).length;
    options.push({ path: [], desire: surroundingFighters ? 2 / surroundingFighters : 99 });

    //choose most desirable path
    const choice = (options.sort((a, b) => a.desire - b.desire)[0]).path;
    const steps = Math.min(choice.length, 2);

    //"think" for 2-3 seconds
    await delay(getRandom(2000, 3000));

    for (let i = 0; i < steps; i++) {
        if (choice[i].weight > 1) {
            break;
        }

        board.moveFighter(board[choice[i].x][choice[i].y], board[enemy.x][enemy.y]);
        
        await delay(500);
        await display(client, db, party, board, actions, turn, null, map);
    }
    
    //attack each surrounding enemy
    const targets = board.getSurrounding(enemy.x, enemy.y)
        .filter(t =>
            t.occupied &&
            t.occupied.fighter &&
            t.occupied.hp > 0 &&
            (t.occupied.human || t.occupied.nonplayer))
        .map(t => t.occupied);
    const turnActions = enemy.getTurn(client, party, targets, { named: true });
    targets.forEach(t => {
        if (t.nonplayer && !t.bananas && t.hp <= 0) {
            board[t.x][t.y].toStick();
        }
    });

    turnActions.forEach(t => actions.push(t));
    await display(client, db, party, board, actions, turn, header, map);
}

async function display(client, db, party, board, actions, turn, header, map, options) {
    options = options || {};
    turn = turn >= party.length ? null : turn;

    //housekeeping
    clearDead(db, party, board, actions);
    clearReactions(map);

    if (header) {
        header.edit(getHeader(party));
    }

    do {
        //start with map display
        const message = board.display(client);

        //turn info
        if (turn && party[turn]) {
            const turnPlayer = party[turn];
    
            let turnText = `\t${turnPlayer.image || turnPlayer.icon} **${turnPlayer.member || turnPlayer.name}'s turn!** `;
            if (!turnPlayer.enemy) {
                turnText += client.emojis.resolve(turnPlayer.weapon.icon).toString();
            }
            if (turnPlayer.shield > 0) {
                turnText += '🛡';
            }
    
            message[0] += turnText;

            if (options.verb) {
                message[2] += `Choose a direction to ${options.verb}`;
            }
            else if (turnPlayer.human) {
                message[2] += `\t🔃 Move (${turnPlayer.steps}/4 steps)\t\t⚔ Attack`;
                message[3] += `\t🧰 Toolbox (${turnPlayer.wood} wood)\t\t🛑 Pass`;
            }
        }

        //add actions. This will break things if actions intersect with turn info
        for (let i = board.height - 1; i > board.height - 11; i--) {
            //only show up to last displayed action 
            const actionIndex = Math.min(count, actions.length) + i - board.height;
            if (actionIndex < 0) {
                break;
            }

            //keep under 2000 character limit per message
            const action = '\t' + actions[actionIndex].toString(1);
            if (message.map(m => m.length).reduce((a, b) => a + b) + action.length > 1950) {
                break;
            }

            message[i] += action;
        }

        //edit message and pause for effect
        await map.edit(message);
        await delay(1000);

        //increment displayed action count unless we are caught up already
        if (count < actions.length) {
            count++;
        }

    } while (count < actions.length);
}

function getHeader(party) {
    const maxLength = Math.max(...party.map(p => p.name.length));
    const header = [];

    header.push(`\`   ${format('Name', maxLength)}   HP   Lvl           ${format('Name', maxLength)}   HP   Lvl\``);
    header.push(`\`   ${'-'.repeat(maxLength)    }  ----  ---           ${'-'.repeat(maxLength)    }  ----  ---\``);

    for(let i = 0; i < party.length; i += 2) {
        if (header.join('\n').length > 1900) {
            header.pop();
            break;
        }

        const p1 = party[i];

        let line = '`';
        line += format(p1.icon, 3);
        line += format(p1.name, maxLength + 2);
        line += format(`${Math.round(p1.hp)}`, 6);
        line += format(p1.lvl, 5);
        line += '     ';
        if (i + 1 < party.length) {
            const p2 = party[i + 1];
            line += format(p2.icon, 3);
            line += format(p2.name, maxLength + 2);
            line += format(`${Math.round(p2.hp)}`, 6);
            line += format(p2.lvl, 3);
        }
        line += '`';

        header.push(line);
    }

    header.push('⠀');
    return header.join('\n');
}

function getResults(client, db, party, board, actions, header, map) {
    const gbps = Math.pow(board.stats.waves + 2, 2);

    actions.push('');
    actions.push(`**Waves spawned: ${board.stats.waves}**`);
    actions.push(`**Enemies killed: ${board.stats.enemies}**`);
    actions.push(`**XP earned: ${board.stats.xp}**`);
    actions.push(`**GBPs earned: ${gbps}**`);

    display(client, db, party, board, actions, null, header, map);
    new Set(party.filter(p => p.member).map(p => p.member.user))
        .forEach(user => updateData(db, user, { gbps: gbps }));
}

function clearReactions(map) {
    map.reactions.cache.forEach(reaction => {
        reaction.users.cache.filter(user => !user.bot).forEach(user => reaction.users.remove(user));
    });
}

function clearDead(db, party, board, actions) {
    while (party.some(p => p.enemy && p.hp <= 0)) {
        const enemy = party.find(p => p.enemy && p.hp <= 0);
        board[enemy.x][enemy.y].toEmpty();
        const xp = enemy.getXP();
        party.splice(party.indexOf(enemy), 1);

        board.stats.xp += xp;
        board.stats.enemies++;

        party.filter(p => p.human).forEach(h => updateData(db, h.member.user, { xp: xp }));
        actions.push(new Action(`*Each player gained ${xp} XP!*`, 0, party));
    }
}