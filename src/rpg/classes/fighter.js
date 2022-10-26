import config from '../../config.js';
import { Action } from './action.js';
import { getBonus } from '../getBonus.js';
import { selectRandom, getRandom, getChance } from '../../utils/random.js';

export class Fighter {
    constructor(lvl, member, db, gbp=0) {
        this.fighter = true;
        this.lvl = lvl;
        this.member = member;

        this.db = db;
        this.gbp = gbp;

        this.bonus = getBonus(this.lvl);
        this.infected = this.member && this.member.roles && this.member.roles.cache.has(config.ids.roles.corona);

        this.poisoned = 0;
        this.burning = 0;
        this.spiders = 0;
        this.shield = 0;
        this.turn = 0;

        this.money = 0;
        this.presents = 0;
    }

    getIcon() {
        return this.hp > 0
            ? this.icon || '🥴'
            : '🪦';
    }

    //executes fighter's turn and returns array of Actions
    getTurn(client, party, targets, options) {
        let actions = [];
        
        options = options || {};

        //skip turn if user failed QTE
        if (!options.skip) {
            if (this.wished) {
                const text = `${this.name} wished upon a spider!`;
                this.opponents.forEach(opponent => opponent.hp = 0);
                actions.push(new Action(text, this.position, party));
            }
            else if (this.stumble) {
                const text = `${this.name} ${(this.cooldown || this.weapon.sequence) ? 'stumbled' : 'missed'}!`;
                actions.push(new Action(text, this.position, party));
            }
            else {
                let hits = this.weapon.hits;
                if (getChance(this.weapon.multihit)) {
                    hits++;
                }

                //get actions per weapon hit
                for (var i = 0; i < hits; i++) {
                    actions = actions.concat(this.getAction(client, party, targets, options));
                    if (targets.every(target => target.hp <= 0)) {
                        break;
                    }
                }
            }
        }

        //reset QTE result
        this.stumble = false;

        //end of turn status effects
        if (this.infected) {
            const dmgText = '*...and lost <dmg> hp to corona*';
            const deathText = dmgText.replace('lost <dmg> hp', 'died');
            const dmg = Math.min(getRandom(1, 2) / 100 * this.max, 10);
            this.getStatusEffect(dmgText, deathText, dmg, actions, party, options);
        }
        if (this.poisoned) {
            const dmgText = '*...and lost <dmg> hp to poison*';
            const deathText = dmgText.replace('lost <dmg> hp', 'died');
            const dmg = Math.min(this.max * 0.05, 20) * this.poisoned;
            this.getStatusEffect(dmgText, deathText, dmg, actions, party, options);
        }
        if (this.burning) {
            this.burning--;
            const dmgText = '*...and burned for <dmg> dmg*';
            const deathText = dmgText.replace('for <dmg> dmg', 'up');
            const dmg = getRandom(5, 10);
            this.getStatusEffect(dmgText, deathText, dmg, actions, party, options);
        }
        if (this.spiders) {
            const dmgText = 'Spiders dealt <dmg> dmg!';
            const deathText = `${this.name} was devoured by spiders!`;
            const dmg = this.spiders;
            this.getStatusEffect(dmgText, deathText, dmg, actions, party, options);
        }
        if (this.weapon.hpRegen && this.hp > 0 && this.hp < this.max) {
            const healText = `${options.named ? `${this.name}: ` : ''}*...and regen'd **+${this.weapon.hpRegen}** hp*`;
            this.hp = Math.min(this.max, this.hp + this.weapon.hpRegen);
            actions.push(new Action(healText, this.position, party));
        }

        if (actions.length) {
            actions[actions.length - 1].turnEnd = true;
        }
        
        return actions;
    }

    //appends status effect dmg
    getStatusEffect(dmgText, deathText, dmg, actions, party, options) {
        if (options.named) {
            const name = `${this.name}: `;
            dmgText = name + dmgText;
            deathText = name + deathText;
        }

        if (this.hp > 0) {
            const damageActions = this.takeDmg(dmg, null, party);
            const statusAction = new Action(
                this.hp <= 0
                    ? deathText
                    : dmgText.replace('<dmg>', `**${Math.round(dmg)}**`),
                this.position,
                party
            );
            actions.push(statusAction);
            actions = actions.concat(damageActions);
        }
    }

    //executes 1 weapon action
    getAction(client, party, targets, options) {
        let actions = [];

        if (this.cooldown) {
            let text = `${this.name} is `;
            if (this.cracked) {
                text +=  'high on crack!';
            }
            else if (this.stunned) {
                text += 'stunned!';
            }
            else {
                text += 'is winding up...';
            }
            actions.push(new Action(text, this.position, party));
            this.cooldown = false;
            this.stunned = false;
        }
        else if (!targets.length) {
            if (this.weapon.sequence) {
                const maths = this.turn % 3;
                const words = ['kame...', '*hame...*', '**ha!**'];
                actions.push(new Action(words[maths], this.position, party));
            }
            else {
                actions.push(new Action(`${this.name} missed!`, this.position, party));
            }
        }
        else {
            targets.forEach(opponent => {
                let text;
                let dmg = 0;

                let results = {};
                if (this.enemy) {
                    results = this.doEnemyThings(client, party, opponent);
                    results.actions.forEach(a => actions.push(a));
                }
    
                if (this.weapon.cursed && getChance(Math.round(7))) {
                    text = `${this.name} is just another victim of the bad girl's curse`;
                    this.hp = 0;
                }
                else if (!results.skip) {
                    if (this.weapon.sequence) {
                        if (options.tres) {
                            const maths = this.turn % 3;
                            const words = ['kame...', '*hame...*', '**ha!**'];
                            text = words[maths];
                            if (maths === 2) {
                                dmg = this.getDmg();
                            }
                        }
                        else {
                            if (this.turn >= this.weapon.sequence.length) {
                                dmg = this.turn * 5;
                            }
                            else if (this.turn === this.weapon.sequence.length - 1) {
                                dmg = this.getDmg();

                                if (opponent.boss) {
                                    dmg /= 2;
                                }
                            }

                            text = this.name + this.weapon.sequence[Math.min(this.turn, this.weapon.sequence.length - 1)]
                                .replace('A', 'A'.repeat(Math.max(this.turn - 5, 1)));
                        }
            
                        if (dmg) {
                            text += ' (**<dmg>** dmg)';
                        }
                    }
                    else if (this.weapon.spidermin) {
                        let amount = getRandom(this.weapon.spidermin, this.weapon.spidermax);
                        if (options.modifySpiders) {
                            amount = Math.max(1, amount + options.modifiers[targets.indexOf(opponent)]); 
                        }
                        text = `${this.name} threw **${amount}** spiders${(options && options.named) ? ` at ${opponent.name}` : '' }`;

                        if (opponent.enemy && opponent.creature.emoji === '🕷') {
                            opponent.weapon.hits += amount;
                            opponent.image += '🕷'.repeat(amount);
                        }
                        else {
                            opponent.spiders += amount * this.getDmg();
                        }
                    }
                    else {
                        let chance = this.weapon.instakill;
                        if (options.modifyCrit) {
                            chance *= options.modifiers[targets.indexOf(opponent)]; 
                        }

                        if (getChance(Math.round(chance))) {
                            text = `${this.name} called upon dark magicks`;
        
                            if (opponent.boss) {
                                dmg = Math.round(40 * this.bonus);
                                text += ' (**<dmg>** dmg)';
                            }
                            else {
                                dmg = Math.max(opponent.hp, opponent.shield);
                            }
                        }
                        else {
                            //standard calculation
                            dmg = this.getDmg();

                            if (options.modifyDmg) {
                                dmg *= options.modifiers[targets.indexOf(opponent)]; 
                            }
            
                            text = `${this.name} hit ${(options && options.named) ? opponent.name + ' ' : '' }for **<dmg>** dmg`;
                        }
                    }
        
                    //dmg calculation finalized
                    text = text.replace('<dmg>', Math.round(dmg));

                    //stacking poison
                    if (opponent.poisoned < this.weapon.maxPoison && getChance(this.weapon.poisonChance)) {
                        opponent.poisoned++;
                        text += ` and poisoned ${opponent.name} (**${opponent.poisoned} stack${opponent.poisoned > 1 ? 's' : ''}**)`;
                    }

                    //lifesteal
                    if (this.weapon.lifesteal && this.hp < this.max) {
                        const heal = Math.min(this.weapon.lifesteal * dmg / 100, this.max - this.hp);
                        this.hp += heal;
                        text += ` and healed **${Math.round(heal)}** hp`;
                    }

                    //this is so exciting!
                    if (!text.endsWith('.')) {
                        text += '!';
                    }

                    //enemy takes dmg
                    const dmgAction = new Action(text, this.position, party);
                    actions.push(dmgAction);
                    actions = actions.concat(opponent.takeDmg(dmg, this, party));
                    dmgAction.setHP(party);
        
                    //recoil dmg
                    if (this.weapon.recoil) {
                        const recoilAction = new Action(`*...and took **${this.weapon.recoil}** recoil dmg*`, this.position, party);
                        actions.push(recoilAction);
                        actions = actions.concat(this.takeDmg(this.weapon.recoil, null, party));
                        recoilAction.setHP(party);
                    }
                }

                //wind-up for slow weapons
                if (this.weapon.slow) {
                    this.cooldown = true;
                }

                this.applyStatus(opponent, 5, party).forEach(a => actions.push(a));
            });
        }

        this.turn++;
        return actions;
    }

    //get damage up to 2 decimal places
    getDmg() {
        //base dmg calculation
        let dmg = getRandom(100 * this.weapon.low, 100 * this.weapon.high) / 100;

        //rage bonus
        dmg += dmg * this.weapon.zerk * (this.max - this.hp) / this.max;

        //superhuman powers
        if (this.cracked) {
            dmg *= 1.1;
        }
        
        return dmg;
    }

    //shield, parry, kill
    takeDmg(dmg, opponent, party) {
        const actions = [];

        if (dmg >= 0 && this.hp > 0) {
            //superhuman powers
            if (this.cracked) {
                dmg *= 0.9;
            }

            //dmg shield first
            if (this.shield > 0) {
                this.shield -= dmg;
                if (this.shield <= 0) {
                    actions.push(new Action(`${this.name}'s shield broke!`, this.position, party));
                }
            }
            else {
                this.hp = Math.max(this.hp - dmg, this.immune ? 1 : 0);
            }

            //parry dmg
            if (opponent && this.weapon.parry) {
                const parry = dmg * this.weapon.parry / 100;
                opponent.hp -= parry;
                const text = `${this.name} parried and returned **${Math.round(parry)}** dmg!`;
                actions.push(new Action(text, this.position, party));
            }

            //child with balloon
            if (opponent && !this.popped && this.weapon.type === '🎈') {
                this.popped = true;
                actions.push(new Action("*You popped the child's balloon...*", opponent.position, party, 3000));
                actions.push(new Action("*Now he's crying!*", opponent.position, party, 5000));
                actions.push(new Action('*You should feel ashamed.*', opponent.position, party));
            }

            //child with costume
            if (opponent && !this.revealed && this.weapon.type === '🛍️') {
                this.revealed = true;
                actions.push(new Action(`*It was just a child in ${this.creature.literal.replace(':adj ', '')} costume!*`, opponent.position, party, 3000));
                actions.push(new Action('*What is wrong with you?!*', opponent.position, party, 5000));
                actions.push(new Action("*Maybe you're the real monster.*", opponent.position, party));
            }

            //enraging the gorilla
            if (opponent && !this.enraged && this.weapon.type === '🧒') {
                actions.push(new Action(`${this.name} is **enraged**!`, this.position, party, 3000));
                this.enraged = true;
                this.weapon.zerk = 1;
            }

            //opponent kills
            if (this.hp <= 0 && opponent) {
                actions.push(new Action(opponent.weapon.win.replace(':w', opponent.name).replace(':l', this.name), opponent.position, party));
            }
        }

        return actions;
    }

    //potentially spread corona/burning
    applyStatus(opponent, coronaChance, party) {
        const actions = [];

        //corona infection
        if (this.infected && !opponent.infected && getChance(coronaChance)) {
            if (!opponent.member || !config.ids.users.immune.includes(opponent.member.id)) {
                actions.push(opponent.infect(this.position, party));    
            }
        }

        //burn
        if ((this.burning || this.weapon.flame) && getChance(50)) {
            if (!opponent.burning) {
                actions.push(new Action(`${opponent.name} caught on fire!`, opponent.position, party));
            }
            opponent.burning = Math.max(opponent.burning, 2);
        }

        //stun
        if (getChance(this.weapon.stun) && !opponent.stunned) {
            actions.push(new Action(`${opponent.name} was stunned!`, opponent.position, party));
            opponent.stunned = true;
            opponent.cooldown = true;
        }

        return actions;
    }

    //infect with corona
    infect(turn, party) {
        this.infected = true;

        if (this.member && this.member.roles) {
            try {
                this.member.roles.add(config.ids.roles.corona);
            }
            catch(err) {
                console.log(`Could not infect ${this.name}: ${err}`);
            }
        }

        return new Action(`${this.name} **caught corona, ${selectRandom(['yuck!', 'eww!', 'gross!', '\\*coughs\\*'])}**`, turn, party);
    }
}