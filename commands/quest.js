const { selectRandom, getRandom, delay, playSong, getData, updateData, format } = require('../utils.js');
const enemies = require('./enemies.json');
const items = require('./items.json');
const { Fighter } = require('../fights.js');
const quicktime = ['🔴', '🔵', '🟢', '🟡'];

module.exports = {
    name: 'quest',
    description: 'Fight a random enemy to earn GBP! React in time to land a hit!',
    execute(client, config, db, message, args) {
        getData(db, message.author.id)
        .then(data => {
            if (!data.Responses || !data.Responses.GBPs || !data.Responses.GBPs.length) {
                return;
            }

            data = data.Responses.GBPs[0];

            const fighter = new Fighter(message.member, { data: data });
            fighter.turn = 2;

            //determine random enemy
            const enemy = new Enemy(data.Lvl);

            //encounter text
            const encounter = [
                'You ran into :c!',
                'You are challenged by :c!',
                'You stumble across :c!',
                ':c gets ready to fight!',
                ':c appeared!'
            ];
            const send = [];
            send.push(`${selectRandom(encounter).replace(':c', enemy.displayName)} ${enemy.icon} (Lvl ${enemy.lvl})`);
            send.push('**React with the icon displayed below your weapon to hit, but be quick!**');
            message.reply(send)
            .then(() => start(client, config, db, message.channel, fighter, enemy))
            .catch(console.error);

            if (enemy.weapon.musical && message.member.voice.channel && !message.member.voice.mute && !message.member.voice.deaf) {
                const song = enemy.creature.emoji === '💀' ? 'spooky' : enemy.weapon.literal;
                playSong(client, message.member.voice.channel, `Enemies/${song}.mp3`, true);
            }
        });   
    }
};

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
        const initiative = `${challengerTurn ? challenger.member.displayName : enemy.displayName} rolled initiative.`;

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
    const maxNameLength = Math.max(challenger.member.displayName.length, enemy.icon.length) + 2;

    const line1 = '`' + format(challenger.member.displayName, maxNameLength + Math.floor(enemy.icon.length / 4)) + 'HP: ' + format(challenger.hp, 4) + '`' + `${emojis.resolve(challenger.weapon.id)}` + (challenger.shield > 0 ? '🛡' : '');
    const line2 = '\n`' + format(enemy.icon, maxNameLength) + 'HP: ' + format(enemy.hp, 4) + '`' + qt;

    return line1 + line2;
}

async function fight(client, config, db, msg, challenger, enemy, challengerTurn) {
    //fists bonus
    if (challenger.weapon.name === 'fists' && challenger.skills.fists) {
        const multiplier = 0.4 + challenger.skills.fists * 0.3;
        const dmg = Math.round(multiplier * getRandom(challenger.weapon.low, challenger.weapon.high) * challenger.bonus);
        const text = `${challenger.member.displayName} sucker-punched ${enemy.member.displayName} for **${dmg}** dmg!`;
        enemy.hp -= dmg;
        await delay(1500).then(() => { display(msg, text, client.emojis, challenger, enemy, true); });
    }

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
        const filter = (reaction, user) => user.id === challenger.member.id;
        await message.awaitReactions(filter, { time: 1500, max: 1 })
        .then(async function(collected) {
            //user reacted in time
            if (collected.has(qt)) {
                await getHits(client, config, message, turnPlayer, opponent, challengerTurn);
            }
            //user is too slow or chose incorrect color
            else {
                const missText = `${challenger.member.displayName} ${challenger.cooldown || challenger.weapon.sequence ? 'stumbled' : 'missed'}!`;
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
            opponent.member.roles.add(config.ids.corona);
            opponent.infected = true;
            const infectText = `${opponent.member.displayName} **caught corona, ${selectRandom(yuck)}**`;
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
            const burn = `${opponent.member.displayName} **caught on fire!**`;
            await delay(1500).then(() => { display(message, burn, client.emojis, challenger, enemy, challengerTurn); });
        }
    }

    //poisoned by daggers
    if (this.poisoned && !this.selfKill) {
        const poisonDamage = Math.round(this.max * this.poisoned * 0.05);
        this.hp -= poisonDamage;
        this.selfKill = this.hp <= 0;
        const poisonText = `*...and ${this.selfKill ? 'died' : `lost **${poisonDamage}** hp`} to poison*`;
        await delay(1500).then(() => { display(message, poisonText, client.emojis, challenger, enemy, challengerTurn); });
    }
}

async function getHits(client, config, message, turnPlayer, opponent, challengerTurn) {
    //get weapon dmg for each hit
    for (var i = 0; i < turnPlayer.weapon.hits; i++) {
        if (challengerTurn) {
            const action = turnPlayer.getUserAction(opponent);
            if (action.dmg && !opponent.popped && opponent.weapon.emoji === '🎈') {
                opponent.popped = true;
                await delay(1500).then(() => { display(message, "*You popped the child's balloon...*", client.emojis, turnPlayer, opponent, true); });
                await delay(3000).then(() => { display(message, "*Now he's crying!*", client.emojis, turnPlayer, opponent, true); });
                await delay(4500).then(() => { display(message, '*You should feel ashamed.*', client.emojis, turnPlayer, opponent, true); });
            }
            await delay(1500).then(() => { display(message, action.text, client.emojis, turnPlayer, opponent, true); });
        }
        else {
            await getEnemyAction(client, config, message, opponent, turnPlayer);
        }
    }
}

async function getEnemyAction(client, config, message, challenger, enemy) {
    let text;
    let dmg;

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
    //get vaxxed!
    else if (enemy.weapon.emoji === '💉' && challenger.infected) {
        text = "You've been vaccinated! Your corona is cured!";
        if (challenger.member.roles.cache.has(config.ids.corona)) {
            challenger.member.roles.remove(config.ids.corona).catch(console.error);
        }
        challenger.hp = 0;
    }
    //my goal is to blow up
    else if (enemy.weapon.emoji === '💣' && getRandom(1)) {
        text = `${enemy.displayName} blew up!`;
        challenger.hp = 0;
        enemy.hp = 0;
        enemy.selfKill = true;
        enemy.bonus = 5; 
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
        if (enemy.weapon.emoji === '🎺' && challenger.member.voice.channel) {
            playSong(client, challenger.member.voice.channel, 'Enemies/trumpet.mp3', true);
        }

        //basic damage calculation
        dmg = Math.round(enemy.bonus * getRandom(enemy.weapon.low, enemy.weapon.high));
        text = `${enemy.displayName} hit for **${dmg}** dmg!`;
    }

    //slow weapons pause between turns
    if (enemy.speed < 0) {
        enemy.cooldown = !enemy.cooldown;
    }

    if (challenger.shield > 0) {
        challenger.shield -= dmg;
        if (challenger.shield <= 0) {
            const shieldText = `${enemy.displayName} broke your shield!`;
            await delay(1500).then(() => { display(message, text, client.emojis, challenger, enemy, false); });
            await delay(1500).then(() => { display(message, shieldText, client.emojis, challenger, enemy, false); });
        }
    }
    else {
        challenger.hp -= dmg;
        await delay(1500).then(() => { display(message, text, client.emojis, challenger, enemy, false); });
    }

    if (challenger.weapon.name === 'sword' && challenger.skills.sword && dmg) {
        const parryDmg = Math.round(0.06 * challenger.skills.sword * dmg);
        if (parryDmg) {
            enemy.hp -= parryDmg;
            const parryText = `${challenger.member.displayName} parried and returned **${parryDmg}** dmg!`;
            await delay(1500).then(() => { display(message, parryText, client.emojis, challenger, enemy, true); });
        }
    }
}

async function getResults(client, db, message, challenger, enemy) {
    const winner = challenger.hp > 0 || (challenger.selfKill && enemy.hp <= 0) ? challenger : enemy;
    const loser  = challenger.hp > 0 || (challenger.selfKill && enemy.hp <= 0) ? enemy : challenger;

    //do not add execution text if curse/self-kill
    if (!loser.cursed && !loser.selfKill) {
        const winText = winner.weapon.win.replace(':w', winner.member.displayName).replace(':l', loser.member.displayName);
        await delay(1500).then(() => { display(message, winText, client.emojis, challenger, enemy, true); });
    }

    //tie
    if (challenger.hp <= 0 && enemy.hp <= 0) {
        await delay(1500).then(() => { display(message, "**It's a tie...**", client.emojis, challenger, enemy, true); });
    }
    //award GBPs
    else {
        if (winner === challenger) {
            //award random GBPs (flat for special creatures)
            const award = enemy.creature.award || getRandom(1, 3);
            const xp = Math.round((enemy.bonus ** 2) * (100 + (enemy.creature.xp || 0)));
            const inventory = {};
            let awardText = `You win ${award} GBPs and ${xp} xp!`;

            //give challenger the golden fiddle item
            if (enemy.weapon.emoji === '🎻') {
                inventory['fiddle'] = true;
                awardText = 'You win this shiny fiddle made of gold!';
            }

            updateData(db, challenger.member.user, { gbps: award, xp: xp, inventory: inventory});
            await delay(1500).then(() => { display(message, awardText, client.emojis, challenger, enemy, true); });
        }
        //lose a GBP
        else {
            updateData(db, challenger.member.user, { gbps: -1 });
            await delay(1500).then(() => { display(message, 'You lose a GBP.', client.emojis, challenger, enemy, true); });
        }
    }

    //end sound clip for enemies with battle music
    if (enemy.weapon.musical && message.guild.me.voice.channel) {
        message.guild.me.voice.channel.leave();
    }

    message.reactions.removeAll();
}

class Enemy {
    constructor(level) {
        //random creature
        this.creature = enemies.creatures[selectRandom(Object.keys(enemies.creatures))];

        let modifier;
        //if special item associated with creature, 50% chance to choose it, or select random
        if (Object.values(enemies.special).some(s => s.enemy === this.creature.emoji) && getRandom(1)) {
            modifier = Object.values(enemies.special).find(s => s.enemy === this.creature.emoji);
        }
        else {
            modifier = enemies.modifiers[selectRandom(Object.keys(enemies.modifiers))];
        }
        this.weapon = Object.assign({}, modifier);

        //add adjective or weapon modifier
        this.displayName = this.weapon.adjective
            ? this.creature.literal.replace(':adj', this.weapon.literal)
            : `${this.creature.literal} with ${this.weapon.literal}`.replace(':adj ', '');

        //use 'an' when appropriate
        if (this.displayName.split('a ', 2).length === 2 && /^[aeio]/.test(this.displayName.split('a ', 2)[1])) {
            this.displayName = this.displayName.replace('a ', 'an ');
        }

        //cheat this in here so it works with other functions
        this.member = { displayName: this.displayName };

        //determine enemy level, affecting stats and rewards
        this.lvl = getRandom(Math.max(1, level - 5), Math.min(99, level + 5));
        this.bonus = 1 + (this.lvl === 99 ? 1 : (this.lvl - 1) / 100);

        //set up stats
        this.cooldown = false;
        this.hp = Math.round(this.bonus * (60 + this.creature.hp));
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