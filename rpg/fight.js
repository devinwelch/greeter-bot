//assumptions:
//  all party members are Fighters
//  each fighter.opponents is set

const { getRandom, selectRandom, getOrder, format, react, delay } = require('../utils');
const { Action } = require('./classes/action');
let QTEs;
const emojis = ['🔴', '🔵', '🟢', '🟡'];
const extended = ['🔴', '🔵', '🟢', '🟡', '🟣','⚫','⚪','🟤','🟠'];
const wish = '🌠';

const self = module.exports;

//if no message, fight will run through and still return actions with no display
self.fight = async function(client, party, message, actions) {
    let count = 0;
    let round = 0;
    actions = actions || [];

    party = getOrder(party);
    actions.push(`${party[0].name} rolled initiative.`);
    
    //easter egg
    const wayOfVikings = party.every(fighter => fighter.weapon.steel) && !getRandom(9);
    if (message && wayOfVikings) {
        actions = actions.concat(sing(true));
    }
    
    //sucker punch
    party.filter(fighter => fighter.weapon.suckerPunch).forEach(fighter => {
        fighter.opponents.forEach(opponent => {
            const dmg = fighter.getDmg() * fighter.weapon.suckerPunch / 100;
            const text = `${fighter.name} sucker-punched ${opponent.name} for **${Math.round(dmg)}** dmg!`;
            opponent.hp -= dmg;
            actions.push(new Action(text, fighter.position, party));
        });

        actions[actions.length - 1].turnEnd = true;
    });

    //display before first QTE comes up
    if (message) {
        QTEs = party.some(enemy => enemy.enemy && enemy.creature.tricky) ? extended : emojis;
        
        react(message, party.some(enemy => enemy.magic) ? QTEs.concat(wish) : QTEs);
        count = await self.display(client, message, actions, party, count);
        await delay(3000);
    }

    //actual fight
    while (fighting(party)) {
        //determine QTE
        if (message) {
            const qt = selectRandom(QTEs);
            count = await self.display(client, message, actions, party, count, qt);
        }
        
        //go through each player's turn
        for(let i = 0; i < party.length; i++) {
            const turnPlayer = party[i];

            //skip turn of dead players
            if (turnPlayer.hp <= 0) {
                continue;
            }

            actions = actions.concat(turnPlayer.getTurn(client, party, turnPlayer.opponents));

            if (message) {
                count = await self.display(client, message, actions, party, count);
            }
            
            //end early if some team wins
            if (!fighting(party)) {
                break;
            }
        }

        if (++round > 99) {
            party.forEach(fighter => fighter.hp = 0);
            actions.push('The inevitable heat death of the universe wipes out all living beings...');
        }
    }

    //easter egg pt.2
    if (message && wayOfVikings && round < 100) {
        actions = actions.concat(sing());
        await self.display(client, message, actions, party, count);
    }

    return actions;
};

function fighting(party) {
    return party.every(fighter => fighter.opponents.some(opponent => opponent.hp > 0));
}

self.display = async function(client, message, actions, party, count, qt) {
    //display next action until caught up
    while(count < actions.length || qt) {
        const text = [];

        //add fighters' status to top of message
        text.push(getHeader(client, party, actions[Math.min(count, actions.length - 1)].hp, qt));

        //increment displayed action count unless we are caught up already
        if (count < actions.length) {
            count++;
        }
        
        //add actions
        for(let i = Math.max(0, count - 20); i < count; i++) {
            text.push(actions[i].toString());
        }

        //clear old actions until under the 2000 character limit
        while(text.map(line => line.length).reduce((a, b) => a + b) >= 1900) {
            text.splice(1, 1);
        }

        //display
        await message.edit(text).catch(console.error);
        
        //wait for reactions
        if (qt) {
            await getReactions(message, party, qt);
            qt = null;
        }
        //pause for effect
        else {
            await delay((actions.length && actions[count - 1].turnEnd) ? 2000 : 1000);
        }
    }

    return count;
};

//displays current hp/shield, thus reveals a small amount of information if event isn't displayed yet
function getHeader(client, party, hp, qt) {
    //get max length of name (or image representation for enemies) + 2 (for formatting)
    const maxNameLength = Math.max(...party.map(fighter => fighter.enemy ? fighter.image.length : fighter.name.length)) + 2;

    //QTE reaction
    const header = [];
    header.push(qt ? `**React with:** ${qt}` : '⠀');

    //status of each fighter
    party.forEach(fighter => {
        let line = '`';
        line += (fighter.image ? format(fighter.image, maxNameLength - 1) : format(fighter.name, maxNameLength));
        line += 'HP: ';
        line += format(Math.ceil(hp ? hp[fighter.position].hp : fighter.hp), 4);
        line += '`';

        if (!fighter.image || fighter.magnetized) {
            const emoji = client.emojis.resolve(fighter.weapon.icon);
            line += emoji ? emoji.toString() : fighter.weapon.icon;
        }
        if ((hp && hp[fighter.position].shield) || fighter.shield > 0) {
            line += '🛡';
        }

        header.push(line);
    });

    //return string
    header.push('');
    return header.join('\n');
}

async function getReactions(message, party, qt) {
    //only consider alive humans
    const reactors = party.filter(fighter => fighter.human && fighter.hp > 0);
    const filter = (reaction, user) => reactors.some(figher => figher.member.id === user.id);
    const collector = message.createReactionCollector(filter, { time: 3000 });
    const start = Date.now();

    collector.on('collect', (reaction, user) => {
        const time = Date.now();
        const fighter = reactors.find(fighter => fighter.member.id === user.id);

        //first reaction by user
        if (!fighter.reaction) {
            fighter.reaction = reaction.emoji.name;

            //evasive enemy
            const factor = fighter.opponents.some(o => o.creature && o.creature.evasive) ? 3 : 1;

            //stumble
            fighter.stumble = fighter.reaction !== qt || (time - start > Math.round(fighter.weapon.reaction / factor));

            //wish
            fighter.wished = fighter.reaction === wish && fighter.opponents.some(opponent => opponent.magic);
        }

        reaction.users.remove(user);
    });

    return new Promise(function(resolve) {
        collector.on('end', () => {
            //punish users that didn't react
            reactors.forEach(fighter => {
                if (!fighter.reaction) {
                    fighter.stumble = true;
                }
                fighter.reaction = null;
            });
            resolve();
        });
    });
}

function sing(beginning) {
    const lyrics = beginning
        ? [ 'Sparks fly high when steel meets steel',
            'And no one can believe',
            'That these two men are best friends',
            'Not enemies!' ]
        : [ 'In this fight of iron wills',
            'One man takes a knee',
            'The other goes for the kill',
            'Like an enemy!' ];

    const actions = lyrics.map(line => new Action(line));
    actions[3].turnEnd = true;

    return actions;
}