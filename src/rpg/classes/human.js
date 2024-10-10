import { Fighter } from './fighter.js';
import { Weapon } from './weapon.js';

export class Human extends Fighter {
    constructor(member, data, db) {
        super(data.Lvl, member, db, data.GBPs);

        this.human = true;
        this.name = member.displayName;
        this.max = 100 * this.bonus;

        this.weapon = new Weapon(this, data.Inventory[data.Equipped]);
        let skillsBonus = data.Skills[this.weapon.type] || 0;
        if (this.weapon.rarity >= 2) {
            skillsBonus++;
        }
        if (skillsBonus) {
            this.setBonus(skillsBonus);
        }

        this.max *= (1 + (this.weapon.bonusHP || 0) / 100);
        this.hp = this.max;
        this.shield = this.weapon.shield * this.max / 100;
    }

    setBonus(bonus) {
        switch(this.weapon.type) {
            case 'bag':
                this.weapon.spidermin += bonus;
                break;
            case 'battleaxe':
                this.weapon.zerk += .25 * bonus;
                break;
            case 'bow':
                this.weapon.multihit += 12 * bonus;
                break;
            case 'daggers':
                this.weapon.poisonChance += 20;
                this.weapon.maxPoison = bonus;
                break;
            case 'fiddle':
                this.weapon.instakill += 1 * bonus;
                break;
            case 'fists':
                this.weapon.suckerPunch += 40 * bonus;
                break;
            case 'kamehameha':
                this.weapon.speed += [10,20,40,75,120][bonus];
                break;
            case 'scythe':
                this.weapon.lifesteal += 8 * bonus;
                break;
            case 'shield':
                this.weapon.bonusHP += 7.5 * bonus;
                break;
            case 'sword':
                this.weapon.parry += 8 * bonus;
                break;
            case 'warhammer':
                this.weapon.stun += 4 * bonus;
                break;
        }
    }
}
