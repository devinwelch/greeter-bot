const { selectRandom, getRandom, delay, playSong, updateGBPs, establishGBPs } = require('../utils.js');
const enemies = require('./enemies.json');
const items = require('./items.json');
const quicktime = ['🔴', '🔵', '🟢', '🟡'];

module.exports = {
    name: 'quest',
    description: 'Fight a random enemy to earn GBP! React in time to land a hit!',
    execute(client, config, db, message, args) {
        //change IDs for test server; should be commented in production
        //config.ids.corona = '701886367625379938';

        if (client.user.raiding) {
            return message.reply('Sorry, I can only handle 1 quest at a time :(');
        }
        else {
            client.user.raiding = true;
        }

        //determine random enemy
        const enemy = new Enemy();
        const send = [];

        //encounter text
        const encounter = [
            'You ran into :c!',
            'You are challenged by :c!',
            'You stumble across :c!',
            ':c gets ready to fight!',
            ':c appeared!'
        ];

        send.push(`${selectRandom(encounter).replace(':c', enemy.displayName)} ${enemy.icon}`);
        send.push('**React with the icon displayed below your weapon to hit, but be quick!**');

        message.reply(send)
        .then(() => setup(client, config, db, message.channel, message.member, enemy))
        .catch(console.error);

        if (enemy.weapon.musical && message.member.voice.channel) {
            playSong(client, message.member.voice.channel, `Enemies/${enemy.weapon.literal}.mp3`, true);
        }
    }
};

async function setup(client, config, db, channel, challenger, enemy) {
    const params = {
        TableName: 'GBPs',
        Key: { UserID: challenger.id }
    };
    db.get(params, function(err, data) {
        if (err) {
            return console.log(err);
        }
        else {
            //reset initial stats so they do not persist from prior duels
            challenger.hp = 100;
            challenger.turn = 2;
            challenger.cooldown = false;
            challenger.selfKill = false;
            challenger.cursed = false;
            challenger.burning = false;
            challenger.infected = challenger.roles.cache.has(config.ids.corona);

            if (!data.Item) {
                //user not established, start them with fists
                establishGBPs(db, challenger.user, 0);
                challenger.weapon = items['fists'];
            }
            else if (data.Item.Equipped === 'random') {
                //select a random weapon from inventory
                const inventory = Object.keys(data.Item.Inventory).filter(key => data.Item.Inventory[key] && items[key] && items[key].weapon);
                challenger.weapon = items[selectRandom(inventory)];
            }
            else {
                challenger.weapon = items[data.Item.Equipped];
            }

            start(client, config, db, channel, challenger, enemy);
        }
    }); 
}

async function start(client, config, db, channel, challenger, enemy) {
    channel.send(getHeader(client.emojis, challenger, enemy))
    .then(msg => {
        //prep for quicktime events
        try {
            quicktime.forEach(q => msg.react(q));
        }
        catch (err) {
            console.log(err);
        }

        //faster weapon goes first, if not then random
        const challengerTurn = challenger.weapon.speed > enemy.speed
        ? true
        : challenger.weapon.speed < enemy.speed
            ? false
            : getRandom(1);

        //declare who goes first
        const initiative = `${challengerTurn ? challenger.displayName : enemy.displayName} rolled initiative.`;

        //display edits and begin process
        delay(2500).then(() => {
            display(msg, initiative, client.emojis, challenger, enemy, true)
            .then(() => {
                fight(client, config, db, msg, challenger, enemy, challengerTurn);
            })
            .catch(console.error);
        });

        
    })
    .catch(console.error);
}

async function display(message, text, emojis, challenger, enemy, left, qt) {
    const header = getHeader(emojis, challenger, enemy, qt);
    let log = `\n${message.content.split('\n').slice(2).join('\n')}`;
    const newLine = '\n' + (left ? '' : '\t'.repeat(left ? 0 : 6)) + text;

    return message.edit(header + log + newLine);
}

function getHeader(emojis, challenger, enemy, qt='') {
    //get status at top of message
    const maxNameLength = Math.max(challenger.displayName.length, enemy.icon.length) + 2;

    const line1 = '`' + format(challenger.displayName, maxNameLength + Math.floor(enemy.icon.length / 4)) + 'HP: ' + format(challenger.hp, 4) + '`' + `${emojis.resolve(challenger.weapon.id)}`;
    const line2 = '\n`' + format(enemy.icon, maxNameLength) + 'HP: ' + format(enemy.hp, 4) + '`' + qt;

    return line1 + line2;
}

function format(str, max) {
    //use to format header in tabular style
    str = str.toString();
    return str + ' '.repeat(max - str.length);
}

async function fight(client, config, db, msg, challenger, enemy, challengerTurn) {
    while(challenger.hp > 0 && enemy.hp > 0) {
        if (challengerTurn) {
            await getTurn(client, config, msg, challenger, enemy, challengerTurn);
        }
        else {
            await getTurn(client, config, msg, enemy, challenger, challengerTurn);
        }
        challengerTurn = !challengerTurn;
    }

    await getResults(client, db, msg, challenger, enemy);
}

async function getTurn(client, config, message, turnPlayer, opponent, challengerTurn) {
    const challenger = challengerTurn ? turnPlayer : opponent;
    const enemy = challengerTurn ? opponent : turnPlayer;

    if (challengerTurn) {
        //select quicktime button
        const qt = selectRandom(quicktime);
        await delay(1500).then(() => { display(message, '', client.emojis, challenger, enemy, challengerTurn, qt); });

        //give user only 1.5 seconds to complete quick-time event
        const filter = (reaction, user) => user.id === challenger.id;
        await message.awaitReactions(filter, { time: 1500, max: 1 })
        .then(async function(collected) {
            //user reacted in time
            if (collected.has(qt)) {
                await getHits(client, config, message, turnPlayer, opponent, challengerTurn);
            }
            //user is too slow or chose incorrect color
            else {
                const missText = `${challenger.displayName} ${challenger.cooldown || challenger.weapon.sequence ? 'stumbled' : 'missed'}!`;
                await delay(1500).then(() => { display(message, missText, client.emojis, challenger, enemy, challengerTurn); });
            }
        });
    }
    else {
        await getHits(client, config, message, turnPlayer, opponent, challengerTurn);
    }

    //if player is infected append status effect results after damage
    if (turnPlayer.infected && !turnPlayer.cursed) {
        const coronaDamage = getRandom(1, 2);
        turnPlayer.hp -= coronaDamage;
        turnPlayer.selfKill = turnPlayer.hp <= 0;
        const coronaText = `*...and ${turnPlayer.selfKill ? 'died' : `lost **${coronaDamage}** hp`} to corona*`;
        await delay(1500).then(() => { display(message, coronaText, client.emojis, challenger, enemy, challengerTurn); });

        //5% chance to infect user
        const yuck = ['yuck!', 'eww!', 'gross!', '\\*coughs\\*'];
        if (turnPlayer === enemy && !opponent.infected && !getRandom(19)) {
            opponent.roles.add(config.ids.corona);
            opponent.infected = true;
            const infectText = `${opponent.displayName} **caught corona, ${selectRandom(yuck)}**`;
            await delay(1500).then(() => { display(message, infectText, client.emojis, challenger, enemy, challengerTurn); });
        }
    }
    
    //burning damage
    if (turnPlayer.burning && !turnPlayer.cursed) {
        const burnDamage = getRandom(5, 10);
        turnPlayer.hp -= burnDamage;
        turnPlayer.selfKill = turnPlayer.hp <= 0;
        const burnText = `*...and ${turnPlayer.selfKill ? 'burned up!' : `burned for **${burnDamage}** hp`}*`;
        await delay(1500).then(() => { display(message, burnText, client.emojis, challenger, enemy, challengerTurn); });

        //burn player
        if (turnPlayer === enemy && !opponent.burning ) {
            opponent.burning = true;
            const burn = `${opponent.displayName} **caught on fire!**`;
            await delay(1500).then(() => { display(message, burn, client.emojis, challenger, enemy, challengerTurn); });
        }
    }
}

async function getHits(client, config, message, turnPlayer, opponent, challengerTurn) {
    //get weapon dmg for each hit
    for (var i = 0; i < turnPlayer.weapon.hits; i++) {
        if (challengerTurn) {
            await getUserAction(client, message, turnPlayer, opponent);
        }
        else {
            await getEnemyAction(client, config, message, opponent, turnPlayer);
        }
    }
}

async function getUserAction(client, message, challenger, enemy) {
    const weapon = challenger.weapon;
    let text;
    let pop = false;

    //skeleton for sequence-style weapons, but just kamehameha for now
    if (weapon.sequence) {
        if (challenger.turn === weapon.sequence.length - 1) {
            enemy.hp = 0;
            pop = true;
        }
        text = challenger.displayName + weapon.sequence[challenger.turn];
        challenger.turn++;
    }
    //7% chance to insta-kill for scythes
    else if (weapon.insta && getRandom(99) < 7) {
        if (weapon.cursed) {
            text = `${challenger.displayName} is just another victim of the bad girl's curse!`;
            challenger.cursed = true;
            challenger.hp = 0;
        }
        else {
            text = `${challenger.displayName} called upon dark magicks!`;
            enemy.hp = 0;
            pop = true;
        }
    }
    else {
        if (challenger.cooldown) {
            text = `${challenger.displayName} is winding up...`;
        }
        else {
            let dmg = getRandom(weapon.low, weapon.high);
            if (weapon.zerk) {
                dmg += Math.ceil(dmg * (100 - challenger.hp) / 101);

                //required to balance axe v. ka matchup
                if (enemy.weapon.name === 'kamehameha') {
                    dmg += 4;
                }
            }
            text = `${challenger.displayName} hit for **${dmg}** dmg!`;
            enemy.hp -= dmg;
            pop = true;
        }

        //slow weapons pause between turns
        if (weapon.speed < 0) {
            challenger.cooldown = !challenger.cooldown;
        }
    }

    if (pop && !enemy.popped && enemy.weapon.emoji === '🎈') {
        enemy.popped = true;
        await delay(1500).then(() => { display(message, "*You popped the child's balloon...*", client.emojis, challenger, enemy, true); });
        await delay(3000).then(() => { display(message, "*Now he's crying!*", client.emojis, challenger, enemy, true); });
        await delay(4500).then(() => { display(message, '*You should feel ashamed.*', client.emojis, challenger, enemy, true); });
    }

    await delay(1500).then(() => { display(message, text, client.emojis, challenger, enemy, true); });
}

async function getEnemyAction(client, config, message, challenger, enemy) {
    let text;

    //how do magnets work?
    if (enemy.weapon.emoji === '🧲' && challenger.weapon.steel) {
        challenger.weapon = items['fists'];
        challenger.cooldown = false;
        const magnetText = 'The magnet stole your weapon!';
        await delay(1500).then(() => { display(message, magnetText, client.emojis, challenger, enemy, false); });
    }
    
    //wisdom
    if (enemy.weapon.emoji === '🖊' && challenger.weapon.name === 'sword') {
        text = 'The pen is mightier than the sword!';
        challenger.hp = 0;
    }
    //my goal is to blow up
    else if (enemy.weapon.emoji === '💉' && challenger.infected) {
        text = "You've been vaccinated! Your corona is cured!";
        if (challenger.roles.cache.has(config.ids.corona)) {
            challenger.roles.remove(config.ids.corona).catch(console.error);
        }
        challenger.hp = 0;
    }
    //my goal is to blow up
    else if (enemy.weapon.emoji === '💣' && getRandom(1)) {
        text = `${enemy.displayName} blew up!`;
        challenger.hp = 0;
        enemy.hp = 0;
        enemy.selfKill = true;
    }
    //bullying the blind
    else if (enemy.weapon.emoji === '🦯' && getRandom(1)) {
        text = `${enemy.displayName} missed!`;
    }
    //wind up for extra slow creatures
    else if (enemy.cooldown) {
        text = `${enemy.displayName} is winding up...`;
    }
    else {
        //doot
        if (enemy.weapon.emoji === '🎺' && challenger.voice.channel) {
            playSong(client, challenger.voice.channel, 'Enemies/trumpet.mp3', true);
        }

        //basic damage calculation
        const dmg = getRandom(enemy.weapon.low, enemy.weapon.high);
        text = `${enemy.displayName} hit for **${dmg}** dmg!`;
        challenger.hp -= dmg;
    }

    //slow weapons pause between turns
    if (enemy.speed < 0) {
        enemy.cooldown = !enemy.cooldown;
    }
    
    await delay(1500).then(() => { display(message, text, client.emojis, challenger, enemy, false); });
}

async function getResults(client, db, message, challenger, enemy) {
    const winner = challenger.hp > 0 || (challenger.selfKill && enemy.hp <= 0) ? challenger : enemy;
    const loser  = challenger.hp > 0 || (challenger.selfKill && enemy.hp <= 0) ? enemy : challenger;

    //do not add execution text if curse/self-kill
    if (!loser.cursed && !loser.selfKill) {
        const winText = winner.weapon.win.replace(':w', winner.displayName).replace(':l', loser.displayName);
        await delay(1500).then(() => { display(message, winText, client.emojis, challenger, enemy, true); });
    }

    //tie
    if (challenger.hp <= 0 && enemy.hp <= 0) {
        await delay(1500).then(() => { display(message, "**It's a tie...**", client.emojis, challenger, enemy, true); });
    }
    //award GBPs
    else {
        if (winner === challenger) {
            //give challenger the golden fiddle item
            if (enemy.weapon.emoji === '🎻') {
                const params = {
                    TableName: 'GBPs',
                    Key: { 'UserID': challenger.id },
                    UpdateExpression: 'set Inventory.fiddle = :b',
                    ExpressionAttributeValues:{ ':b': true }
                };
        
                db.update(params, function(err) {
                    if (err) {
                        console.log(`Could not give fiddle to ${challenger.displayName}`, JSON.stringify(err, null, 2));
                    }
                    else {
                        console.log(`Gave ${challenger.displayName} a fiddle`);
                    }
                });
                
                await delay(1500).then(() => { display(message, 'You win this shiny fiddle made of gold!', client.emojis, challenger, enemy, true); });
            }
            //award random GBPs (flat for special creatures)
            else {
                const award = enemy.creature.award || getRandom(1, 3);
                const awardText = `You win ${award} GBPs!`;
                updateGBPs(db, challenger.user, award);
                await delay(1500).then(() => { display(message, awardText, client.emojis, challenger, enemy, true); });
            }
        }
        //lose a GBP
        else {
            updateGBPs(db, challenger.user, -1);
            await delay(1500).then(() => { display(message, 'You lose a GBP.', client.emojis, challenger, enemy, true); });
        }
    }

    //end sound clip for enemies with battle music
    if (enemy.weapon.musical && message.guild.me.voice.channel) {
        message.guild.me.voice.channel.leave();
    }

    client.user.raiding = false;
    message.reactions.removeAll();
}

class Enemy {
    constructor() {
        //random creature
        this.creature = enemies.creatures[selectRandom(Object.keys(enemies.creatures))];

        //if special item associated with creature, 50% chance to choose it, or select random
        if (Object.values(enemies.special).some(s => s.enemy === this.creature.emoji) && getRandom(1)) {
            this.weapon = Object.values(enemies.special).find(s => s.enemy === this.creature.emoji);
        }
        else {
            this.weapon = enemies.modifiers[selectRandom(Object.keys(enemies.modifiers))];
        }

        //add adjective or weapon modifier
        this.displayName = this.weapon.adjective
            ? this.creature.literal.replace(':adj', this.weapon.literal)
            : `${this.creature.literal} with ${this.weapon.literal}`.replace(':adj ', '');

        //use 'an' when appropriate
        if (this.displayName.split('a ', 2).length === 2 && /^[aeio]/.test(this.displayName.split('a ', 2)[1])) {
            this.displayName = this.displayName.replace('a ', 'an ');
        }

        //set up stats
        this.cooldown = false;
        this.hp = 60 + this.creature.hp;
        this.speed = 1 + (this.creature.speed || 0);
        this.weapon.hits = this.creature.hits || 1;
        this.weapon.low = this.weapon.emoji === '🔫' ? 40 : 1 + this.creature.dmg;
        this.weapon.high = this.weapon.emoji === '🔫' ? 80 :  30 + this.creature.dmg;
        if (this.creature.emoji === '🐸' || this.creature.emoji === '🦀') {
            this.weapon.high = Math.floor(this.weapon.high / 2);
        }

        this.weapon.win = ':w has slain :l!';

        //status effects
        if (this.weapon.emoji === '🦠') {
            this.infected = true;
        }
        if (this.weapon.emoji === '🔥') {
            this.burning = true;
        }

        //represent the enemy visually
        const c = this.creature.emoji.repeat(this.weapon.hits);
        this.icon = this.weapon.left
            ? this.weapon.emoji + c
            : c + this.weapon.emoji;
    }
}