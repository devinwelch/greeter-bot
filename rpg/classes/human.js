const { Fighter } = require('./fighter');
const { Weapon } = require('./weapon');

module.exports.Human = class extends Fighter {
    constructor(member, data, db) {
        super(data.Lvl, member, db, data.GBPs);

        this.human = true;
        this.name = member.displayName;
        this.max = 100 * this.bonus;

        this.weapon = new Weapon(data.Inventory[data.Equipped]);
        let skillsBonus = data.Skills[this.weapon.type] || 0;
        if (this.weapon.rarity === 3) {
            skillsBonus += 1;
        }
        if (skillsBonus) {
            this.getWeaponBonus(skillsBonus);
        }

        if (member.high) {
            member.high = false;
            this.cracked = true;
            this.cooldown = true;
        }

        this.hp = this.max;
    }

    getWeaponBonus(bonus) {
        let multiplier = 0;
        let amount = 0;

        switch(this.weapon.type) {
            case 'bag':
                this.weapon.spidermin += bonus;
                break;
            case 'battleaxe':
                this.weapon.zerk += .3 * bonus;
                break;
            case 'bow':
                this.weapon.multihit += 10 * bonus;
                break;
            case 'daggers':
                this.weapon.poisonChance += 20;
                this.weapon.maxPoison = bonus;
                break;
            case 'fiddle':
                this.weapon.instakill += 2 * bonus;
                break;
            case 'fists':
                this.weapon.suckerPunch += 30 + 40 * bonus;
                break;
            case 'kamehameha':
                multiplier = bonus > 2 ? bonus - 1 : bonus;
                amount =  20 * multiplier;
                if (bonus > 2) {
                    this.shield += amount;
                }
                else {
                    this.max += amount;
                }
                break;
            case 'scythe':
                this.weapon.lifeSteal += 12 * bonus;
                break;
            case 'sword':
                this.weapon.parry += 8 * bonus;
                break;
            case 'treasure':
                this.weapon.discount += 20 * bonus;
                break;
            case 'warhammer':
                this.weapon.stun += 5 * bonus;
                break;
        }
    }
};