import { getRandom, selectRandom, getChance } from '../../utils/random.js';
import { generateWeapon } from '../generateWeapon.js';
import { playFile } from '../../sound/playFile.js';
import { Fighter } from './fighter.js';
import { Weapon } from './weapon.js';
import { Action } from './action.js';
import enemies from '../data/enemies.js';

export class Enemy extends Fighter {
    constructor(lvl, options) {
        //lvl range: -5% thru +10%
        lvl = getRandom(Math.max(1, Math.round(0.95 * lvl)), Math.min(99, Math.round(1.1 * lvl)));

        super(lvl);
        options = options || {};
        this.enemy = true;

        //select creature type to determine base stats
        this.creature = options.creature
            ? enemies.creatures[options.creature]
            : selectRandom(Object.values(enemies.creatures));

        //choose modifier weapon or adjective
        let modifier;
        if (options.modifier) {
            modifier = enemies.modifiers[options.modifier] || enemies.special[options.modifier];
        }
        else {
            const special = Object.values(enemies.special).filter(s => !(options.ban && s.banned)).find(s => s.enemy === this.creature.emoji);
            if (special && getChance(special.chance || 50)) {
                modifier = special;
            }
            else {
                modifier = enemies.modifiers[selectRandom(Object.keys(enemies.modifiers))];
            }
        }

        //assign a name
        if (options.name) {
            this.name = options.name;
        }
        else {
            this.name = modifier.adjective
                ? this.creature.literal.replace(':adj', modifier.literal)
                : `${this.creature.literal} with ${modifier.literal}`.replace(':adj ', '');

            //use 'an' when appropriate
            if (this.name.split('a ', 2).length === 2 && /^[aeio]/.test(this.name.split('a ', 2)[1])) {
                this.name = this.name.replace('a ', 'an ');
            }
        }

        //hp
        this.max = modifier.emoji === '🛍️' ? 100 : this.bonus * (60 + this.creature.hp);
        this.hp = this.max;
        this.shield += (this.bonus * this.creature.shield) || 0;
        
        //weapon
        this.weapon = new Weapon(this, {
            type: modifier.emoji,
            name: modifier.literal,
            icon: modifier.emoji,
            lvl:  this.lvl,
            low:  this.bonus * (modifier.emoji === '🔫' ? 40 : 1  + this.creature.dmg),
            high: this.bonus * (modifier.emoji === '🔫' ? 80 : 30 + this.creature.dmg),
            hits: this.creature.hits,
            slow: this.creature.slow,
            priority: (this.creature.speed || 0) + (modifier.speed || 0),
            lifesteal: this.creature.lifesteal || 0
        });
        this.weapon.musical = modifier.musical;
        if (this.creature.emoji === '🐸' || this.creature.emoji === '🦀') {
            this.weapon.high /= 2;
        }

        //status effects
        if (this.weapon.type === '🦠') {
            this.infected = true;
        }
        else if (this.weapon.type === '🔥') {
            this.burning = 2;
        }
        else if (this.weapon.type === '🪄') {
            this.magic = true;
        }

        //represent the enemy visually
        const c = this.creature.emoji.repeat(this.weapon.hits);
        this.image = modifier.left
            ? modifier.emoji + c
            : c + modifier.emoji;
    }

    doEnemyThings(client, party, opponent) {
        const actions = [];
        let skip = false;

        //how do magnets work?
        if (this.weapon.type === '🧲' && opponent.weapon.steel) {
            this.magnetized = true;
            this.weapon = Object.assign({}, opponent.weapon);
            this.name = this.name.replace('magnet', this.weapon.type);
            opponent.weapon = generateWeapon(opponent.lvl, { chances: [1, 0, 0, 0, 0], type: 'fists' });
            opponent.cooldown = false;
            actions.push(new Action('The magnet stole your weapon!', this.position, party));
        }

        //wisdom
        else if (this.weapon.type === '🖊' && opponent.weapon.type === 'sword' && !this.pen) {
            actions.push(new Action('The pen is mightier than the sword!', this.position, party));
            this.pen = true;
            this.weapon.low  += 50;
            this.weapon.high += 50;
        }

        //get vaxxed!
        else if (this.weapon.type === '💉' && opponent.infected) {
            actions.push(new Action(`${opponent.name} has been vaccinated! Your corona is cured!`, this.position, party));
            if (opponent.member.roles.cache.has(client.ids.roles.corona)) {
                opponent.member.roles.remove(client.ids.roles.corona.corona).catch(console.error);
            }
            opponent.hp = 0;
            skip = true;
        }

        //my goal is to blow up
        else if (this.weapon.type === '💣' && getRandom(1)) {
            opponent.hp = 0;
            this.hp = 0;
            actions.push(new Action(`${this.name} blew up!`, this.position, party));
            skip = true;
        }

        //bullying the blind
        else if (this.weapon.type === '🦯' && getRandom(1)) {
            actions.push(new Action(`${this.name} missed!`, this.position, party));
            skip = true;
        }

        //doot
        else if (this.weapon.type === '🎺' && opponent.member && opponent.member.voice.channel) {
            playFile(client, opponent.member.voice.channel, 'doot.mp3', true);
        }

        //dicks out
        else if (this.weapon.type === '🧒' && !this.enraged) {
            if (this.turn > 4) {
                actions.push(new Action("You've been super cool, bro. Here, check out my banana hoard!", this.position, party));
                this.hp = 0;
            }
            else {
                const chillin = [
                    "He's cradling the boy!",
                    "They're just chillin'!",
                    "They're hanging out, playing some Mario Kart",
                    "He's throwing back a brewski and the kid has a juice box!",
                    "He's treating the kid like his own son!",
                    "They're playing some catch!",
                    "He's giving the kid some sage advice!",
                    "He's consoling the kid while waiting for the mother!",
                    "They're pal-ing around!",
                    "He's teaching the kid the ways of the jungle!"
                ];

                actions.push(new Action(selectRandom(chillin), this.position, party));
            }
            
            skip = true;
        }

        return { actions: actions, skip: skip };
    }

    getXP() {
        if (this.weapon.type === '🛍️') {
            return 0;
        }
        
        return Math.round(this.bonus ** 2 * (100 + (this.creature.xp || 0)));
    }
}