const { getRandom, selectRandom, assembleParty, playSong, shuffle, format, react, delay, updateData, generateWeapon, addToInventory } = require('../utils');
const { Action } = require('../rpg/classes/action');
const { Board } = require('../rpg/classes/board');
const { Human } = require('../rpg/classes/human');
const { Enemy } = require('../rpg/classes/enemy');
const { astar } = require('../rpg/astar');
const { once } = require('events');
const fs = require('fs');

//limitations
//  2000 char limit per message
//  custom emojis include id in char count
//  198 emoji limit per message
//TODO
//  sucker punch

const directions = ['⬅️', '↖️', '↙️', '⬆️', '🔄', '🔀', '⬇️', '↘️', '↗️', '➡️'];
const names = fs.readFileSync('./rpg/unicorn.txt').toString().split(',');
let count = 0;

module.exports = {
    name: 'invasion',
    description: 'Join with friends in strategic D&D-esque combat versus a horde of evil unicorns!',
    category: 'rpg',
    aliases: ['unicorn', 'unicorns'],
    usage: '[glory]',
    execute(client, config, db, message, args) {
        //send invite
        const invite = [];
        invite.push('The evil sorcer Zargothrax corrupted an army of unicorns!');
        invite.push(`Join ${message.member.displayName} in the fray as you fight for your lives!`);
        invite.push(`React with ${client.emojis.resolve(config.ids.yeehaw)} to join the party.`);
        invite.push(`Leader, react with ${client.emojis.resolve(config.ids.sanic)} to get started right away!`);

        assembleParty(client, config, db, message.channel, message.author, invite, 0)
        .then(results => {
            if (results.party.length > 12) {
                return message.reply("There's a maximum of 12 players per battle, sorry!");
            }
            if (results) {
                if (results.party.length === 1) {
                    results.party.push(results.party[0]);
                }
                setup(client, db, message.guild, message.channel, results.party, results.data.Responses.GBPs);
            }
        });

        if (args.toLowerCase().includes('glory') && message.member.voice.channel) {
            playSong(client, message.member.voice.channel, 'invasion.mp3', true);
        }
    }
};

function setup(client, db, guild, channel, party, data) {
    let position = 0;
    const combatants = [];

    shuffle(party).forEach(user => {
        const userData = data.find(d => d.UserID === user.id);
        const member = guild.members.resolve(user);
        const human = new Human(member, userData);
        human.position = position++;

        const name = selectRandom(names);
        names.splice(names.indexOf(name), 1);
        const enemy = new Enemy(userData.Lvl, { creature: 'unicorn', name: name });
        enemy.position = position++;

        combatants.push(human);
        combatants.push(enemy);
    });

    const board = new Board(combatants);
    start(client, db, channel, combatants, board);
}

async function start(client, db, channel, party, board) {
    //break into 2 messages to circumvent character limit
    const header = await channel.send('<reserved>');
    const map = await channel.send('<reserved>');

    react(map, directions);
    count = await display(client, party, board, [], 0, header, map);

    fight(client, db, party, board, header, map);
}

async function fight(client, db, party, board, header, map) {
    let actions = [];
    let turn = -1;
    let round = 1;

    while(party.filter(p => p.enemy).some(u => u.hp > 0) && 
          party.filter(p => p.human).some(h => h.hp > 0))
    {
        turn = ++turn % party.length;
        if (party[turn].hp <= 0) {
            continue;
        }

        await getTurn(client, party, board, actions, turn, header, map);

        if (turn === party.length - 1) {
            await rain(client, party, board, actions, turn, header, map, round);
            round++;
        }
    }

    getResults(client, db, party, board, actions, turn, header, map);
}

async function getResults(client, db, party, board, actions, turn, header, map) {
    const humans  = party.filter(p => p.human);
    const enemies = party.filter(p => p.enemy);

    if (humans[0].member === humans[1].member) {
        humans.pop();
    }

    let win = false;
    let xpAward = 0;
    enemies.filter(e => e.hp <= 0).forEach(e => {
        xpAward += Math.round(e.bonus * 100);
    });

    let xpText;
    if (enemies.every(e => e.hp <= 0)) {
        win = true;
        xpAward += 50 * enemies.length;
        xpText = `You've defeated Zargothrax's army! Each player is awarded ${xpAward} XP!`;
    }
    else {
        xpText = xpAward
            ? `You were defeated, but went down fighting. Each party member earns ${xpAward} XP.`
            : 'You and all the townspeople were slaughtered.';
    }

    actions.push(new Action(xpText, party.length, party));
    count = await display(client, party, board, actions, null, header, map);
    await delay(1500);

    let additional = ['**Individual awards:**'];
    for (let i = 0; i < humans.length; i++) {
        const h = humans[i];
        const options = {
            xp: xpAward,
        };

        if (win) {
            let line = `${h.name}: `;
            const weapons = [];

            for(let j = 0; j < h.presents + 1; j++) {
                const weapon = generateWeapon(h.lvl, { chances: [60, 25, 12, 3] });
                const bb = await addToInventory(client, db, h.member.user, weapon);
                weapons.push(`${weapon.getRarity()} ${weapon.name}${bb ? ' (buyback)' : ''}`);
            }
            line += weapons.join(', ');

            if (h.money) {
                const gbps = 50 * h.money;
                options.gbps = gbps;
                line += `, ${gbps} GBPs`;
            }

            additional.push(line);
        }

        updateData(db, h.member.user, options);
    }

    if (win) {
        map.channel.send(additional, { split: true });
    }
}

async function getTurn(client, party, board, actions, turn, header, map) {
    const turnPlayer = party[turn];
    let teleported = false;
    //2 moves per player, up this?
    for (let moves = 2; moves > 0; moves--) {
        teleported = await move(client, party, board, actions, turn, header, map, moves) || teleported;
    }

    count = await display(client, party, board, actions, turn, header, map);
    await delay(500);

    //attack each surrounding enemy
    let targets = board.getSurrounding(turnPlayer.x, turnPlayer.y, { far: turnPlayer.weapon.priority >= 1 })
        .filter(t =>
            t.occupied &&
            t.occupied.fighter &&
            t.occupied.hp > 0 &&
            t.occupied.human !== turnPlayer.human)
        .map(t => t.occupied);

    const turnActions = turnPlayer.getTurn(client, party, targets, { skip: teleported, named: true });
    turnActions.forEach(t => actions.push(t));
    
    count = await display(client, party, board, actions, turn, header, map);
}

async function move(client, party, board, actions, turn, header, map, moves) {
    count = await display(client, party, board, actions, turn, header, map, moves);

    const turnPlayer = party[turn];
    let teleport = false;

    //enemy movement
    if (turnPlayer.enemy) {
        const graph = board.getGraph();
        const start = graph.grid[turnPlayer.x][turnPlayer.y];
        const options = [];

        //check viability of movement towards each square in grid
        //  this can be optimized, but speed is not a current priority as we need to wait for the AI to 'think' for visual effect
        for (let y = 1; y <= board.height; y++) {
            for (let x = 1; x <= board.width; x++) {
                //do not route to occupied spaces (except current space)
                if (board[x][y].occupied && board[x][y].occupied !== turnPlayer) {
                    continue;
                }

                //do not route towards non-combative spaces
                const surroundingFighters = board.getSurrounding(x, y)
                    .filter(tile => tile.occupied.human)
                    .map(tile => tile.occupied)
                    .filter(f => f.hp > 0);
                if (!surroundingFighters.length) {
                    continue;
                }

                const end = graph.grid[x][y];
                const result = astar.search(graph, start, end, { heuristic: astar.heuristics.diagonal });

                //cannot find route to reach space
                if (!result.length) {
                    if (board[x][y].occupied === turnPlayer) {
                        result.push({ x: turnPlayer.x, y: turnPlayer.y });
                        result.push({ x: turnPlayer.x, y: turnPlayer.y });
                    }
                    else {
                        continue;
                    }
                }

                //determine desire to reach space (lower number = more desirable):
                //  base initial desire on amount of steps to reach target
                //  prioritize attacks on multiple targets
                //  factor in average percent remaining hp to hit weaker targets
                let desire = result.length;
                desire /= surroundingFighters.length;
                desire *= surroundingFighters.map(f => f.hp).reduce((a, b) => a + b) / surroundingFighters.map(f => f.max).reduce((a, b) => a + b);

                options.push({ x: result[0].x, y: result[0].y, desire: desire });
            }
        }

        let choice;
        if (options.length) {
            //move 1 step towards most desirable path
            choice = options.sort((a, b) => a.desire - b.desire)[0];
        }
        else {
            //cannot find route to any players, rely on teleport
            choice = board.getRandomTile();
            teleport = true;
        }
        
        board.moveFighter(board[choice.x][choice.y], board[turnPlayer.x][turnPlayer.y]);
    
        //"think" for 1-3 seconds
        await delay(moves > 1 ? getRandom(1000, 3000) : 500);

        return teleport;
    }
    else {
        const filter = (reaction, user) => user === turnPlayer.member.user && directions.includes(reaction.emoji.name);
        const collector = map.createReactionCollector(filter, { time: 30000 });
        
        collector.on('collect', reaction => {
            if (reaction.emoji.name === '🔄') {
                collector.stop();
            }
            else if (reaction.emoji.name === '🔀') {
                const randomTile = board.getRandomTile();
                board.moveFighter(randomTile, board[turnPlayer.x][turnPlayer.y]);
                teleport = true;
                collector.stop();
            }
            else {
                let x = 0;
                let y = 0;

                switch (reaction.emoji.name) {
                    case '⬅️': x = -1;         break;
                    case '↖️': x = -1; y = -1; break;
                    case '↙️': x = -1; y =  1; break;
                    case '⬆️':         y = -1; break;
                    case '⬇️':         y =  1; break;
                    case '↘️': x =  1; y =  1; break;
                    case '↗️': x =  1; y = -1; break;
                    case '➡️': x =  1;         break;
                }

                x += turnPlayer.x;
                y += turnPlayer.y;

                if (x > 0 && x <= board.width && y > 0 && y <= board.height && !board[x][y].occupied) {
                    board.moveFighter(board[x][y], board[turnPlayer.x][turnPlayer.y]);
                    collector.stop();
                }
            }
        });

        await once(collector, 'end');

        map.reactions.cache.forEach(reaction => {
            reaction.users.cache.filter(user => !user.bot).forEach(user => reaction.users.remove(user));
        });
    }

    return teleport;
}

async function rain(client, party, board, actions, turn, header, map, round) {
    //every 5 rounds, add one extra effect
    for(let i = 0; i < Math.ceil(round / 5); i++) {
        const victims = [];
        const exposed = party.filter(p => p.hp > 0 && board.getSurrounding(p.x, p.y).every(s => s.flat));

        //fireballs
        if (!exposed.length || getRandom(1)) {
            const x = getRandom(1, board.width);
            const y = getRandom(1, board.height);
            
            actions.push(new Action(`A fireball crashes down on ${getCoordinates(x, y)}!`, party.length, party));
            count = await display(client, party, board, actions, null, header, map);
            await delay(1500);

            //user at impact point loses 10% max hp, place crater at location
            const impact = victimize(board, x, y, '☄️', 10, { burn: true, crater: true });
            if (impact) {
                victims.push(impact);
            }

            //surrounding users lose 5% hp, burn trees
            const surrounding = board.getSurrounding(x, y);
            surrounding.forEach(s => {
                const burned = victimize(board, s.x, s.y, '🔥', 5, { burn: true });
                if (burned) {
                    victims.push(burned);
                }
            });
        }
        //lightning
        else {
            const victim = selectRandom(exposed);
            victims.push(victimize(board, victim.x, victim.y, '⚡', 20, {}));

            actions.push(new Action(`Lightning strikes ${getCoordinates(victim.x, victim.y)}!`, party.length, party));
            count = await display(client, party, board, actions, null, header, map);
            await delay(1500);
        }

        if (victims.length) {
            actions.push(new Action(`${victims.map(v => v.name).join('/')} took **${victims.map(v => v.dmg).join('**/**')}** dmg!`, party.length, party));
        }

        count = await display(client, party, board, actions, null, header, map);
        await delay(3000);
    }

    board.clearTemp();
}

function victimize(board, x, y, icon, dmgPercent, options) {
    //set temporary icon
    board[x][y].temp = icon;

    //victim is tile occupant, if any (and alive)
    let victim = board[x][y].occupied;
    if (victim && victim.hp && victim.hp > 0) {
        //deal percent of hp dmg
        const dmg = Math.round(dmgPercent / 100 * victim.max);
        victim.hp -= dmg;

        if (options.burn) {
            victim.burning = 1;
        }

        return { name: victim.name, dmg: dmg };
    }
    //place crater in place of terrain (if not in water)
    else if (options.crater && !board[x][y].water) {
        board[x][y].toCrater();
    }
    //burn trees
    else if (options.burn && board[x][y].tree) {
        board[x][y].toEmpty();
    }

    return false;
}

async function display(client, party, board, actions, turn, header, map, moves) {
    do {
        //add map display
        const message = [board.toString()];

        //add actions (newest at top)
        for (let i = Math.min(count, actions.length - 1); i >= Math.max(0, actions.length - 11); i--) {
            let nextAction = actions[i].toString();
            if (i === actions.length - 1) {
                nextAction = `**${nextAction}**`;
            }

            //keep under 2000 character limit per message
            if (message.map(m => m.length).reduce((a, b) => a + b) + nextAction.length < 1950) {
                message.push(nextAction);
            }
        }

        //edit messages; there will be some lag between responses
        await header.edit(getHeader(client, party, turn, moves));
        await map.edit(message);

        //pause for effect
        await delay(1000);

        //increment displayed action count unless we are caught up already
        if (count < actions.length) {
            count++;
        }

    } while (count < actions.length);
    
    return count;
}

function getHeader(client, party, turn, moves) {
    const maxHuman = Math.max(...party.filter(p => p.human).map(h => h.name.length));
    const maxEnemy = Math.max(...party.filter(p => p.enemy).map(e => e.name.length));
    const header = [];

    if (turn !== null) {
        const turnPlayer = party[turn];

        let turnText = `${turnPlayer.image || turnPlayer.icon} **${turnPlayer.name}'s turn!** `;
        if (!turnPlayer.enemy) {
            turnText += client.emojis.resolve(turnPlayer.weapon.icon).toString();
            if (turnPlayer.shield > 0) {
                turnText += '🛡';
            }
        }

        //change if we give players more movement
        if (moves) {
            turnText += ` (moves remaining: ${moves})`;
        }

        header.push(turnText);
    }

    header.push(`\`   ${format('Name', maxHuman)}   HP   Lvl  Loc.           ${format('Name', maxEnemy)}   HP   Lvl  Loc.\``);
    header.push(`\`   ${'-'.repeat(maxHuman)    }  ----  ---  ----           ${'-'.repeat(maxEnemy)    }  ----  ---  ----\``);

    for(let i = 0; i < party.length; i += 2) {
        const f = party[i];
        const u = party[i + 1];

        let line = '`';
        line += format(f.icon, 3);
        line += format(f.name, maxHuman + 2);
        line += format(Math.round(f.hp), 6);
        line += format(f.lvl, 5);
        line += format(getCoordinates(f.x, f.y), 4);
        line += '        ';
        line += format(u.icon, 3);
        line += format(u.name, maxEnemy + 2);
        line += format(Math.round(u.hp), 7);
        line += format(u.lvl, 4);
        line += format(getCoordinates(u.x, u.y), 4);
        line += '`';

        header.push(line);
    }

    header.push('⠀');
    return header.join('\n');
}

function getCoordinates(x, y) {
    return String.fromCharCode(64 + x) + y.toString();
}