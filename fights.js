
const { selectRandom, getRandom, format, delay } = require('./utils.js');
const items = require('./commands/items.json');
const config = require('./config.json');

const self = module.exports;
self.Fighter = class { 
    constructor(member, options) {
        if (options.boss) {
            //required options: partySize
            this.boss = true;
            this.max = 70 + 80 * options.partySize;
            this.bonus = 1 + .1 * Math.min(options.partySize, 4);
            this.weapon = { id: config.ids.woop, speed: 1, hits: 1, win: 'The party wiped!' };
            this.shield = 0;
        }
        else {
            //required options: data
            this.bonus = 1 + (options.data.Lvl === 99 ? 100 : options.data.Lvl - 1) / 100; 
            this.max = 100 * this.bonus;
            this.hp = this.max;
            this.turn = 0;
            this.infected = member.roles.cache.has(config.ids.corona);
            this.member = member;
            if (options.data.Equipped === 'random') {
                const inventory = Object.keys(options.data.Inventory)
                    .filter(key => options.data.Inventory[key] && items[key] && items[key].weapon);
                this.weapon = items[selectRandom(inventory)];
            }
            else {
                this.weapon = items[options.data.Equipped];
            }

            //skill tree bonuses
            this.skills = options.data.Skills || {};
            if (this.weapon.name === 'kamehameha' && this.skills.kamehameha) {
                if (this.skills.kamehameha < 3) {
                    this.max += this.skills.kamehameha * 10;
                    this.hp += this.max;
                }
                else {
                    this.shield = 20;
                }
            }
            else {
                this.shield = 0;
            }
        }

        this.hp = this.max;
        this.infected = member.roles.cache.has(config.ids.corona);
        this.member = member;
        this.poisoned = 0;
    }

    //executes fighter's turn and returns Actions
    getTurn(party, turn, getAction) {
        let actions = [];
        let hits = this.weapon.hits;
        //upgraded bow
        if (this.weapon.name === 'bow' && this.skills.bow && getRandom(99) < (7 * this.skills.bow)) {
            hits++;
        }
        //get damage action per weapon hit
        for (var i = 0; i < hits; i++) {
            let action;
            if (getAction) {
                actions.push(new self.Action(getAction(party, turn), turn, party));
            }
            else {
                //idea: list of opponent IDs to make double battles possible
                const opponent = 
                    party.find(fighter => fighter.boss) ||
                    party.find(fighter => fighter.member !== this.member);
                action = this.getUserAction(opponent);
                actions.push(new self.Action(action.text, turn, party));

                if (action.dmg && opponent.weapon.name === 'sword' && opponent.skills.sword) {
                    const dmg = Math.round(0.06 * opponent.skills.sword * action.dmg);
                    if (dmg) {
                        this.hp -= dmg;
                        const parry = `${opponent.member.displayName} parried and returned **${dmg}** dmg!`;
                        actions.push(new self.Action(parry, party.indexOf(opponent), party));
                    }
                }
            }
        }

        //if player is infected append status effect results after damage
        if (this.infected && !this.selfKill) {
            const coronaDamage = getRandom(1, 2);
            this.hp -= coronaDamage;
            this.selfKill = this.hp <= 0;
            const coronaText = `*...and ${this.selfKill ? 'died' : `lost **${coronaDamage}** hp`} to corona*`;
            actions.push(new self.Action(coronaText, turn, party));

            //5% chance to infect opponent, half for boss
            if (self.boss) {
                const opponents = party.filter(fighter => !fighter.infected && !fighter.boss);
                opponents.forEach(fighter => {
                    if (!getRandom(39)) {
                        actions.push(new self.Action(infect(config, fighter), turn, party));
                    }
                });
            }
            else {
                const opponent = 
                    party.find(fighter => fighter.boss) ||
                    party.find(fighter => fighter.member !== this.member);
                if (!getRandom(19) && !opponent.infected) {
                    actions.push(new self.Action(infect(config, opponent), turn, party));
                }
            }
        }

        //poisoned by daggers
        if (this.poisoned && !this.selfKill) {
            const poisonDamage = Math.round(this.max * this.poisoned * 0.05);
            this.hp -= poisonDamage;
            this.selfKill = this.hp <= 0;
            const poisonText = `*...and ${this.selfKill ? 'died' : `lost **${poisonDamage}** hp`} to poison*`;
            actions.push(new self.Action(poisonText, turn, party));
        }

        actions[actions.length - 1].turnEnd = true;
        return actions;
    }

    //executes 1 weapon action and returns text
    getUserAction(opponent) {
        const weapon = this.weapon;
        let text;
        let dmg = 0;
        let chance = 7;
        //fiddle bonus
        if (this.weapon.name === 'fiddle' && this.skills.fiddle) {
            chance += this.skills.fiddle;
        }

        //skeleton for sequence-style weapons, but just kamehameha for now
        if (weapon.sequence) {
            if (this.turn >= weapon.sequence.length) {
                //make kamehameha viable after blast
                dmg = this.turn * 5;
            }
            else if (this.turn === weapon.sequence.length - 1) {
                dmg = opponent.boss ? 110 : opponent.hp;
            }
            text = this.member.displayName + weapon.sequence[Math.min(this.turn, weapon.sequence.length - 1)]
                .replace('A', 'A'.repeat(Math.max(this.turn - 5, 1)));
            text += dmg > 0 ? ' (**<dmg>** dmg)' : '';
            this.turn++;
        }
        else if (weapon.insta && getRandom(99) < chance) {
            if (weapon.cursed) {
                text = `${this.member.displayName} is just another victim of the bad girl's curse`;
                this.selfKill = true;
                this.hp = 0;
            }
            else if (opponent.boss) {
                //nerf from insta-kill
                dmg = 60;
                text = `${this.member.displayName} called upon dark magicks to deal **<dmg>** dmg`;
            }
            else {
                text = `${this.member.displayName} called upon dark magicks`;
                dmg = opponent.hp;
            }
        }
        else {
            if (this.cooldown) {
                text = `${this.member.displayName} is winding up...`;
            }
            else {
                let low = weapon.low;
                //upgraded warhammer bonus
                if (this.weapon.name === 'warhammer' && this.skills.warhammer) {
                    low += 3 * this.skills.warhammer;
                }
                dmg = getRandom(low, weapon.high);
                if (weapon.zerk) {
                    //upgraded battleaxe bonus
                    dmg += Math.ceil(dmg * (0.2 * (this.skills.battleaxe || 0) + 1) * (this.max - this.hp) / (this.max + 1));

                    //required to balance axe v. ka matchup
                    if (opponent.weapon.name === 'kamehameha') {
                        opponent.shield = 0;
                        dmg += 4;
                    }
                }
                text = `${this.member.displayName} hit for **<dmg>** dmg`;
            }

            //slow weapons pause between turns
            if (weapon.speed < 0) {
                this.cooldown = !this.cooldown;
            }
        }

        //stacking poison for upgraded daggers
        if (this.weapon.name === 'daggers' &&
            this.skills.daggers &&
            opponent.poisoned < this.skills.daggers &&
            !getRandom(7))
        {
            opponent.poisoned++;
            text += ` and poisoned ${opponent.member.displayName} (**${opponent.poisoned} stack${opponent.poisoned > 1 ? 's' : ''}**)!`;
        }

        dmg = Math.round(dmg * this.bonus);

        if (opponent.shield > 0) {
            opponent.shield -= dmg;
            if (opponent.shield <= 0) {
                text += ` and broke ${opponent.member.displayName}'s shield`;
                //buff warhammer
                this.cooldown = false;
            }
        }
        else {
            opponent.hp -= dmg;
        }

        //lifesteal for upgraded scythe
        if (this.weapon.name === 'scythe' && this.skills.scythe && this.hp < this.max) {
            const heal = Math.min(Math.round(this.skills.scythe * .08 * dmg), this.max - this.hp);
            this.hp += heal;
            text += ` and healed **${heal}** hp`;
        }

        //this is so exciting!
        if (!text.endsWith('.')) {
            text += '!';
        }
        
        return { text: text.replace('<dmg>', dmg), dmg: dmg };
    }
};

self.Action = class {
    constructor(text, turn, party) {
        this.text = text;
        this.turn = turn;

        this.hp = {};
        party.forEach(fighter => this.hp[fighter.member.id] = fighter.hp);

        this.shield = {};
        party.forEach(fighter => this.shield[fighter.member.id] = fighter.shield > 0);
    }
};

self.getHeader = function(client, party, hp, shield) {
    const maxNameLength = Math.max(...party.map(fighter => fighter.member.displayName.length)) + 2;

    const header = [];
    party.forEach(fighter => {
        const fighterHP = hp ? hp[fighter.member.id] : fighter.max;
        const fighterShield = shield && shield[fighter.member.id] ? '🛡' : '';
        header.push(`\`${format(fighter.member.displayName, maxNameLength)} HP: ${format(fighterHP, 4)}\` ${client.emojis.resolve(fighter.weapon.id)}${fighterShield}`);
    });

    header.push('');
    return header.join('\n');
};

self.display = function(client, message, actions, party, previousTurn, clear = false) {
    if (actions.length) {
        //replace header with new HPs
        const action = actions.shift();
        let log = self.getHeader(client, party, action.hp, action.shield);

        //clear after each round
        if (!clear || previousTurn <= action.turn) {
            log += message.content.split('\n').slice(party.length).join('\n');
        }

        //add next action
        log += `\n${'\t'.repeat(action.left ? 0 : (clear ? 3 : 6) * action.turn)}${action.text}`;

        //pause and edit message
        message.edit(log)
        .then(msg => {
            const wait = clear && action.turn === party.length - 1 && action.turnEnd
                ? 3000
                : action.turnEnd
                    ? 1500
                    : 750;
            delay(wait).then(() => self.display(client, msg, actions, party, action.turn, clear));
        })
        .catch(console.error);
    }
};

self.getOrder = function(party) {
    //get different weapon speeds
    const speeds = [...new Set(party.map(fighter => fighter.weapon.speed))];
    let order = [];

    //randomize order of player per different weapon speed
    speeds.sort((a, b) => b - a).forEach(speed => {
        const players = party.filter(user => user.weapon.speed === speed);
        for (var i = players.length - 1; i > 0; i--) {
            const j = getRandom(i);
            [players[i], players[j]] = [players[j], players[i]];
        }
        order = order.concat(players);
    });
    
    return order;
};

function infect(fighter) {
    //add corona role and return text
    fighter.member.roles.add(config.ids.corona);
    fighter.infected =- true;

    return `${fighter.member.displayName} **caught corona, ${selectRandom(['yuck!', 'eww!', 'gross!', '\\*coughs\\*'])}**`;
}