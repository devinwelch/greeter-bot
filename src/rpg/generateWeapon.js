import { v4 } from 'uuid';
import weaponList from './data/weapons.js';
import { getBonus } from './getBonus.js';
import { getRandom, selectRandom, shuffle } from '../utils/random.js';
import { Weapon, enchantingKey, enchantingTable } from './classes/weapon.js';

/**
 * Returns a Weapon with random attributes
 * @param options { id, treasureHunter, chances, type, plain }
 * @returns Weapon
 */

export function generateWeapon(fighter, options) {
    options = options || {};

    //generate uuid
    const id = options.id || v4();

    //determine rarity
    const chances = options.chances || [65, 23, 10, 2, 0];
    if (options.treasureHunter) {
        chances[0] = Math.round(0.75 * chances[0]);
        chances[1] = Math.round(0.75 * chances[1]);
        chances[2] = Math.round(1.25 * chances[2]);
        chances[3] = Math.round(1.25 * chances[3]);
        chances[4] = Math.round(1.50 * chances[4]);
    }
    const roll = getRandom(chances.reduce((a, b) => a + b) - 1);
    const rarity = 
        roll < chances[0] ? 0 :
        roll < chances[0] + chances[1] ? 1 :
        roll < chances[0] + chances[1] + chances[2] ? 2 : 
        roll < chances[0] + chances[1] + chances[2] + chances[3] ? 3 : 4;

    //do not award common fists (randomly)
    let weapons = Object.values(weaponList).filter(weapon => !weapon.hidden);
    if (!rarity && options.type !== 'fists') {
        weapons = weapons.filter(w => w.type !== 'fists');
    }

    const w = options.type
        ? weapons.find(w => w.type === options.type) 
        : selectRandom(weapons);

    const weapon = new Weapon(fighter, {
        rarity:         rarity,
        id:             id,

        type:           w.type,
        name:           w.name,
        icon:           w.icons[rarity],
        description:    w.description,
        win:            w.win,

        low:            w.low,
        high:           w.high,
        priority:       w.priority,
        hits:           w.hits,
        steel:          w.steel,

        spidermin:      w.spidermin,
        spidermax:      w.spidermax,
        zerk:           w.zerk,
        instakill:      w.instakill,
        sequence:       w.sequence,
        slow:           w.slow
    });

    const lvl = fighter?.lvl || 0;
    weapon.lvl = Math.round(0.9 * lvl);
    let bonus = getBonus(lvl);

    const dmg = randn_bm(95, 110, 1.5) / 100;

    weapon.low *= bonus * dmg;
    weapon.high *= bonus * dmg;
    weapon.bonuses = [];

    if (options.plain) {
        return weapon;
    }

    let perks =
        rarity === 0 ? getRandom(0, 1) :
        rarity === 1 ? getRandom(0, 3) :
        rarity === 2 ? getRandom(1, 3) :
        rarity === 3 ? getRandom(1, 3) : 
                       getRandom(4, 5) ;

    let stats = [];
    for (let i = 0; i < enchantingKey.length; i++) {
        for (let j = 0; j < enchantingTable[weapon.type][i]; j++) {
            stats.push(enchantingKey[i]);
        }
    }
    shuffle(stats);
    stats = [...new Set(stats)];

    let zerk;

    for (let i = 0; i < perks; i++) {
        switch(stats[i]) {
            case 'react':
                bonus = getEnchantmentBonus(1, 4, 2);
                weapon.reaction = 1500 + 250 * bonus;
                weapon.bonuses.push(`+${bonus === 4 ? '1s' : 250 * bonus + 'ms'} reaction time`);
                break;
            case 'insta':
                bonus = getEnchantmentBonus(2, 4);
                weapon.instakill += bonus / 2;
                weapon.bonuses.push(`+${bonus / 2}% instakill chance`);
                break;
            case 'zerk':
                bonus = getEnchantmentBonus(2, 6, 2);
                zerk = Math.round((bonus * .05 + Number.EPSILON) * 100) / 100;
                weapon.zerk += zerk;
                weapon.bonuses.push(`+${zerk}% dmg per 1% hp missing`);
                break;
            case 'multi':
                bonus = getEnchantmentBonus(3, 10, 2);
                weapon.multi += bonus;
                weapon.bonuses.push(`+${bonus}% chance to attack twice`);
                break;
            case 'ls':
                bonus = getEnchantmentBonus(5, 12);
                weapon.lifesteal += bonus;
                weapon.bonuses.push(`+${bonus}% life steal`);
                break;
            case 'parry':
                bonus = getEnchantmentBonus(4, 8);
                weapon.parry += bonus;
                weapon.bonuses.push(`+${bonus}% dmg returned to attacker`);
                break;
            case 'stun':
                weapon.stun += 5;
                weapon.bonuses.push('+5% stun chance');
                break;
            case 'spimin':
                bonus = getEnchantmentBonus(0, 2, 2);
                if (!bonus) break;
                weapon.spidermin += bonus;
                weapon.bonuses.push(`+${bonus} minimum spiders thrown`);
                break;
            case 'spimax':
                bonus = getEnchantmentBonus(0, 2, 2);
                if (!bonus) break;
                weapon.spidermax += bonus;
                weapon.bonuses.push(`+${bonus} maximum spiders thrown`);
                break;
            case 'pois':
                bonus = getEnchantmentBonus(5, 10);
                weapon.poisonChance += bonus;
                weapon.bonuses.push(`+${bonus}% poison chance`);
                break;
            case 'sucpun':
                bonus = getEnchantmentBonus(10, 50, 2);
                weapon.suckerPunch = bonus;
                weapon.bonuses.push(`+${bonus}% sucker punch dmg`);
                break;
            case 'trhu':
                weapon.treasureHunter = true;
                weapon.bonuses.push('+Quest loot rarity %');
                break;
            case 'pri':
                bonus = getEnchantmentBonus(1, 2);
                weapon.priority += bonus / 2;
                weapon.bonuses.push(`+${bonus / 2} priority`);
                break;
            case 'speed':
                bonus = getEnchantmentBonus(10, 25);
                weapon.speed = bonus;
                weapon.bonuses.push(`+${weapon.speed} speed`);
                break;
            case 'regen':
                bonus = getEnchantmentBonus(1, 3, 2);
                weapon.speed = bonus;
                weapon.bonuses.push(`+${bonus}% HP regen`);
                break;
            case 'flame':
                weapon.flame = true;
                weapon.bonuses.push('+Hotness');
                break;
        }
    }

    function getEnchantmentBonus(min, max, iterations=1) {
        if (rarity === 4) {
            return max;
        }

        const results = [];
        for (let i=0; i<iterations; i++) {
            results.push(getRandom(min, max));
        }
        const average = Math.round(results.reduce((a, b) => a + b, 0) / 2);

        return average;
    }

    return weapon;
}


function randn_bm(min, max, skew) {
    //stolen from: https://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve

    let u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();

    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    
    num = num / 10.0 + 0.5; // Translate to 0 -> 1
    if (num > 1 || num < 0) {
        num = randn_bm(min, max, skew); // resample between 0 and 1 if out of range
    }
    else {
        num = Math.pow(num, skew); // Skew
        num *= max - min; // Stretch to fill range
        num += min; // offset to min
    }

    return num;
}