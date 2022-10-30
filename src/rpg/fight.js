//assumptions:
//  all party members are Fighters
//  each fighter.opponents is set

import items from './data/items.js';
import { getOrder } from './getOrder.js';
import { delay } from '../utils/delay.js';
import { pad } from '../utils/pad.js';
import { Action } from './classes/action.js';
import { MessageActionRow, MessageButton } from 'discord.js';
import { getChance, selectRandom, shuffle } from '../utils/random.js';

//if no message, fight will run through and still return actions with no display
export async function fight(client, party, message, actions) {
    let count = 0;
    let round = 0;
    actions = actions || [];

    party = getOrder(party);
    actions.push(new Action(`${party[0].name} rolled initiative.`, 0, party));
    
    //easter egg
    const wayOfVikings = party.every(fighter => fighter.weapon.steel) && getChance(100);
    if (message && wayOfVikings) {
        actions = actions.concat(sing(true));
    }
    
    //sucker punch
    party.filter(fighter => fighter.weapon.suckerPunch).forEach(fighter => {
        fighter.opponents.forEach(opponent => {
            const dmg = fighter.getDmg() * fighter.weapon.suckerPunch / 100;
            const text = `${fighter.name} sucker-punched ${opponent.name} for **${Math.round(dmg)}** dmg!`;
            opponent.takeDmg(dmg, fighter, party);
            actions.push(new Action(text, fighter.position, party));
        });

        actions[actions.length - 1].turnEnd = true;
    });

    //trolleddub
    party.filter(fighter => fighter.weapon.type === '🦻').forEach(enemy => {
        if (enemy.opponents.some(opponent => opponent.weapon.type === 'fiddle')) {
            const shieldBonus = 40 * enemy.bonus;
            enemy.shield += shieldBonus;
            actions.push(new Action(`${enemy.name} turned down its hearing aid!`, enemy.position, party));
        }

        if (actions[actions.length - 1])
        actions[actions.length - 1].turnEnd = true;
    });

    //add buttons
    //TODO
    let components, QTEs;
    if (message) {
        const options = {
            shadow: party.some(enemy => enemy.enemy && enemy.creature.shadowy),
            extended: party.some(enemy => enemy.enemy && enemy.creature.tricky),
            magic: party.some(enemy => enemy.magic),
            crack: party.some(human => human.hasCrack)
        };

        [components, QTEs] = getComponents(options);

        count = await display(client, message, actions, party, count, null, components);
        await delay(3000);
    }

    //actual fight
    while (fighting(party)) {
        //determine QTE
        if (message) {
            const qt = selectRandom(QTEs);
            count = await display(client, message, actions, party, count, qt);
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
                count = await display(client, message, actions, party, count);
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
        await display(client, message, actions, party, count);
    }

    return actions;
}

function getComponents(options) {
    const basic = [{id:'red',emoji:'🔴'}, {id:'blu',emoji:'🔵'}, {id:'grn',emoji:'🟢'}, {id:'ylw',emoji:'🟡'}];
    const extra = [{id:'pur',emoji:'🟣'}, {id:'wht',emoji:'⚪'}, {id:'brn',emoji:'🟤'}, {id:'org',emoji:'🟠'}];
    const black = [{id:'sqr',emoji:'⬛'}, {id:'cir',emoji:'⚫'}, {id:'hrt',emoji:'🖤'}, {id:'str',emoji:'✴️'}];
    const rows = [], QTEs = [];

    if (options.shadow) {
        rows.push(getRow(black));
        black.forEach(e => QTEs.push(e));
    }
    else {
        rows.push(getRow(basic));
        basic.forEach(e => QTEs.push(e));
    }

    if (options.extended) {
        rows.push(getRow(extra));
        extra.forEach(e => QTEs.push(e));
    }

    if (options.magic || options.crack) {
        const row = new MessageActionRow();
        if (options.magic) {
            row.addComponents([getButton({id: 'wish', emoji: '🌠' })]);
        }
        if (options.crack) {
            row.addComponents([getButton({id: 'crack', emoji: items.crack.icon })]);
        }
    }

    return [rows, QTEs];

    function getRow(arr) {
        const row = new MessageActionRow();

        shuffle(arr);
        arr.forEach(e => row.addComponents([getButton(e)]));

        return row;
    }

    function getButton(obj) {
        return new MessageButton()
            .setCustomId(obj.id)
            .setEmoji(obj.emoji)
            .setStyle('SECONDARY');
    }
}

function fighting(party) {
    return party.every(fighter => fighter.opponents.some(opponent => opponent.hp > 0));
}

export async function display(client, message, actions, party, count, qt, components) {
    //display next action until caught up
    while(count < actions.length || qt) {
        const text = [];

        //add fighters' status to top of message
        text.push(getHeader(client, party, actions[Math.min(count, actions.length - 1)].hp, qt?.emoji));

        //increment displayed action count unless we are caught up already
        if (count < actions.length) {
            count++;
        }
        
        //add actions
        for(let i = Math.max(0, count - 12); i < count; i++) {
            text.push(actions[i].toString());
        }

        //clear old actions until under the 2000 character limit
        while(text.map(line => line.length).reduce((a, b) => a + b) >= 1900) {
            text.splice(1, 1);
        }

        //display
        await message.edit({ content: text.join('\n'), components: components }).catch(console.error);
        
        //wait for reactions
        if (qt) {
            await getActions(message, party, qt);
            qt = null;
        }
        //pause for effect
        else {
            await delay((actions.length && actions[count - 1].turnEnd) ? 2000 : 1000);
        }
    }

    return count;
}

//displays current hp/shield, thus reveals a small amount of information if event isn't displayed yet
function getHeader(client, party, hp, qt) {
    //get max length of name (or image representation for enemies) + 2 (for formatting)
    const maxNameLength = Math.max(...party.map(fighter => fighter.enemy ? fighter.image.length : fighter.name.length)) + 2;

    //QTE reaction
    const header = [];
    header.push(qt ? `**Press:** ${qt}` : '⠀');

    //status of each fighter
    party.forEach(fighter => {
        let line = '`';
        line += (fighter.image ? pad(fighter.image, maxNameLength - 1) : pad(fighter.name, maxNameLength));
        line += 'HP: ';
        line += pad(Math.ceil(hp ? hp[fighter.position].hp : fighter.hp), 4);
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

async function getActions(message, party, qt) {
    //only consider alive humans
    const reactors = party.filter(fighter => fighter.human && fighter.hp > 0);
    const filter = buttonInteraction => reactors.some(fighter => fighter.member.id === buttonInteraction.user.id) && buttonInteraction.message.id === message.id;

    const collector = message.channel.createMessageComponentCollector({ filter, time: 3000 });
    const start = Date.now();

    collector.on('collect', buttonInteraction => {
        const time = Date.now();
        buttonInteraction.deferUpdate();
        const fighter = reactors.find(fighter => fighter.member.id === buttonInteraction.user.id);

        //first reaction by user
        if (!fighter.reaction) {
            fighter.reaction = buttonInteraction.customId;

            //evasive enemy
            const factor = fighter.opponents.some(o => o.creature && o.creature.evasive) ? 3 : 1;

            //stumble
            fighter.stumble = fighter.reaction !== qt.id || (time - start > (fighter.weapon.reaction + 500) / factor);

            //wish
            fighter.wished = fighter.reaction === 'wish' && fighter.opponents.some(opponent => opponent.magic);
        }
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