const { getRandom, selectRandom, playSong, generateWeapon } = require('../../utils');
const { Fighter } = require('./fighter');
const { Weapon } = require('./weapon');
const { Action } = require('./action');
const enemies = require('../enemies.json');
const config = require('../../config.json');

module.exports.Enemy = class extends Fighter {
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
        else if (Object.values(enemies.special).some(s => s.enemy === this.creature.emoji) && getRandom(1)) {
            modifier = Object.values(enemies.special).find(s => s.enemy === this.creature.emoji);
        }
        else {
            modifier = enemies.modifiers[selectRandom(Object.keys(enemies.modifiers))];
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
        this.max = this.bonus * (60 + this.creature.hp);
        this.hp = this.max;
        
        //weapon
        this.weapon = new Weapon({
            type: modifier.emoji,
            name: modifier.literal,
            icon: modifier.emoji,
            lvl:  this.lvl,
            low:  this.bonus * (modifier.emoji === '🔫' ? 40 : 1  + this.creature.dmg),
            high: this.bonus * (modifier.emoji === '🔫' ? 80 : 30 + this.creature.dmg),
            hits: this.creature.hits,
            slow: this.creature.slow,
            priority: this.creature.speed || 0
        });
        this.weapon.musical = modifier.musical;
        if (this.creature.emoji === '🐸' || this.creature.emoji === '🦀') {
            this.weapon.high /= 2;
        }


        //status effects
        if (this.weapon.type === '🦠') {
            this.infected = true;
        }
        if (this.weapon.type === '🔥') {
            this.burning = true;
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
            opponent.weapon = generateWeapon(opponent.lvl, { chances: [1, 0, 0, 0], type: 'fists' });
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
            if (opponent.member.roles.cache.has(config.ids.corona)) {
                opponent.member.roles.remove(config.ids.corona).catch(console.error);
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
        else if (this.weapon.type === '🎺' && opponent.member.voice.channel) {
            playSong(client, opponent.member.voice.channel, 'Enemies/trumpet.mp3', true);
        }

        return { actions: actions, skip: skip };
    }
};