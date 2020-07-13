const { Fighter } = require('./fighter');
const { Weapon } = require('./weapon');

module.exports.Human = class extends Fighter {
    constructor(member, data) {
        super(data.Lvl, member);

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
        const epic = this.weapon.isEpic();

        let multiplier = 0;
        let amount = 0;
        let dmg = 0;

        switch(this.weapon.type) {
            case 'bag':
                if (epic) {
                    this.weapon.spidermin += 1;
                }
                this.weapon.spidermax += bonus;
                break;
            case 'battleaxe':
                this.weapon.zerk += (epic ? .25 : .2) * bonus;
                break;
            case 'bow':
                this.weapon.multihit = (epic ? 10 : 7) * bonus;
                break;
            case 'daggers':
                this.weapon.poisonChance = epic ? 20 : 12.5;
                this.weapon.maxPoison = bonus;
                break;
            case 'fiddle':
                this.weapon.instakill += (epic ? 2 : 1.5) * bonus;
                break;
            case 'fists':
                this.weapon.suckerPunch = 40 + (epic ? 40 : 30) * bonus;
                break;
            case 'kamehameha':
                multiplier = bonus > 2 ? bonus - 1 : bonus;
                amount = (epic ? 15 : 10) * multiplier;
                if (bonus > 2) {
                    this.shield += amount;
                }
                else {
                    this.max += amount;
                }
                break;
            case 'scythe':
                this.weapon.lifeSteal = (epic ? 12 : 9) * bonus;
                break;
            case 'sword':
                this.weapon.parry = (epic ? 8 : 6);
                break;
            case 'warhammer':
                dmg = (epic ? 5 : 4) * bonus;
                this.weapon.low += dmg;
                this.weapon.high += dmg;
                this.weapon.recoil = 2 * bonus;
                break;
        }
    }
};