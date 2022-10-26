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
        if (this.weapon.rarity === 3) {
            skillsBonus++;
        }
        if (skillsBonus) {
            this.setBonus(skillsBonus);
        }

        this.hp = this.max;
    }

    setBonus(bonus) {
        switch(this.weapon.type) {
            case 'bag':
                this.weapon.spidermin = bonus;
                break;
            case 'battleaxe':
                this.weapon.zerk = .25 * bonus;
                break;
            case 'bow':
                this.weapon.multihit = 12 * bonus;
                break;
            case 'daggers':
                this.weapon.poisonChance = 20;
                this.weapon.maxPoison = bonus;
                break;
            case 'fiddle':
                this.weapon.instakill = 1 * bonus;
                break;
            case 'fists':
                this.weapon.suckerPunch = 40 * bonus;
                break;
            case 'kamehameha':
                this.weapon.quickStart = 25 * bonus;
                break;
            case 'scythe':
                this.weapon.lifesteal = 10 * bonus;
                break;
            case 'sword':
                this.weapon.parry = 8 * bonus;
                break;
            case 'warhammer':
                this.weapon.stun = 5 * bonus;
                break;
        }
    }
}