export class Weapon {

    constructor(fighter, data) {
        //super(fighter, data);
        this.fighter = fighter;
        this.data = data || {};
        this.weapon = true;

        //ux
        const win = ':w defeated :l!';
        this.set('type');           //type for skills bonus
        this.set('name');           //weapon name literal
        this.set('rarity', 0);      //0:common, 1:rare, 2:epic, 3:legendary, 4: cursed
        this.set('icon', '👌');     //icon to display, emoji or custom ID
        this.set('description');    //item description based on type
        this.set('bonuses', []);    //listed item stat variations
        this.set('win', win);       //victory message
        this.set('lvl', 1);         //lvl requirement
        this.set('id');             //uuid
        
        //basic stats
        this.set('low', 1);             //low roll dmg
        this.set('high', 30);           //high roll dmg
        this.set('priority', 0);        //higher priority weapons attack first (guaranteed)
        this.set('speed', 0);           //faster equal priority weapons have a chance to attack first
        this.set('hits', 1);            //# of hits per turn
        this.set('reaction', 1500);     //time in ms to react
        this.set('steel', false);       //weapon material
        this.set('hpRegen', 0);         //flat hp regen

        //weapon or skill-specific
        this.set('spidermin', 0);       //minimum spiders per hit
        this.set('spidermax', 0);       //maximum spiders per hit
        this.set('zerk', 0);            //% dmg increase per % hp missing
        this.set('multihit', 0);        //% chance to hit twice
        this.set('poisonChance', 0);    //% chance to poison
        this.set('maxPoison', 0);       //# of stacks
        this.set('instakill', 0);       //instakill % chance
        this.set('suckerPunch', 0);     //% dmg sucker punch hits for
        this.set('sequence');           //kamehameha
        this.set('lifesteal', 0);       //% dmg to heal for
        this.set('parry', 0);           //% dmg to return
        this.set('slow');               //boolean, whether to have cooldown after weapon hit
        this.set('recoil', 0);          //% hp recoil dmg on hit
        this.set('stun', 0);            //% chance to stun target

        this.set('treasureHunter', false);  //increases loot luck

        delete this.data;
    }

    set(stat, def) {
        this[stat] = this.data[stat] || def;
    }

    toString(client, sell = true) {
        const arr = [
            `**${this.getRarity()} ${this.name}** ${client.emojis.resolve(this.icon)}`,
            `Description: ${this.description}`,
            `Lvl Requirement: ${this.lvl}`,
            `Dmg: ${this.low.toFixed(2)} - ${this.high.toFixed(2)}`
        ];

        if (this.bonuses.length) {
            arr.push(`Bonuses:\n  • ${this.bonuses.join('\n  • ')}`);
        }

        arr.push(`${sell ? 'Sells for' : 'Cost'}: ${this.sell()} GBPs`);

        return arr.join('\n');
    }

    sell() {
        return [5, 25, 75, 200, 69][this.rarity];
    }

    getRarity() {
        return ['Common', 'Rare', 'Epic', 'Legendary', 'Cursed'][this.rarity];
    }

    getBonuses() {
        const bonuses = [];

        const zerk = this.getZerk();
        if (zerk) bonuses.push(`${zerk} zerk`);

        const multihit = this.getMultihit();
        if (multihit) bonuses.push(`${zerk} multihit %`);

        const poisonChance = this.getPoisonChance();
        if (poisonChance) bonuses.push(`${poisonChance} poison %`);

        const suckerPunch = this.getSuckerPunch();
        if (suckerPunch) bonuses.push(`${suckerPunch}% suckerpunch`);

        const lifesteal = this.getLifesteal();
        if (lifesteal) bonuses.push(`${lifesteal}% lifesteal`);

        const parry = this.getParry();
        if (parry) bonuses.push(`${parry}% parry`);

        const stun = this.getStun();
        if (stun) bonuses.push(`${parry}% stun`);

        return bonuses;
    }

    getHits()           { return this.fighter?.hits         || 0 + this.hits; }
    getSpidermin()      { return this.fighter?.spidermin    || 0 + this.spidermin; }
    getSpidermax()      { return this.fighter?.spidermax    || 0 + this.spidermax; }
    getZerk()           { return this.fighter?.zerk         || 0 + this.zerk; }
    getMultihit()       { return this.fighter?.multihit     || 0 + this.multihit; }
    getPoisonChance()   { return this.fighter?.poisonChance || 0 + this.poisonChance; }
    getInstakill()      { return this.fighter?.instakill    || 0 + this.instakill; }
    getSuckerPunch()    { return this.fighter?.suckerPunch  || 0 + this.suckerPunch; }
    getLifesteal()      { return this.fighter?.lifesteal    || 0 + this.lifesteal; }
    getParry()          { return this.fighter?.parry        || 0 + this.parry; }
    getStun()           { return this.fighter?.stun         || 0 + this.stun; }

    getMultiplier() {
        if (!this.fighter) {
            return 1;
        }

        return 1 + this.getZerk() * (this.max - this.hp) / this.max;
    }
    getLow() { 
        return (this.fighter?.dmg || 0 + this.low) * this.getMultiplier();
    }
    getHigh() {
        return (this.fighter?.dmg || 0 + this.high) * this.getMultiplier();
    }
}

export const enchantingKey = 
['insta', 'zerk', 'multi', 'ls', 'parry', 'stun', 'spimin', 'spimax', 'pois', 'sucpun', 'trhu', 'pri', 'speed', 'regen', 'flame'];

export const enchantingTable = {
    //           Insta  Zerk    Multi   LS      Parry   Stun    SpiMin  SpiMax  Pois%   SucPun  TrHu    Pri     Speed   Regen   Flame
    bag:        [0,     0,      0,      0,      1,      0,      3,      3,      0,      0,      1,      1,      2,      2,      0],
    battleaxe:  [1,     3,      1,      2,      1,      1,      0,      0,      0,      0,      1,      1,      2,      2,      1],
    bow:        [1,     1,      3,      2,      1,      1,      0,      0,      0,      0,      1,      0,      0,      2,      1],
    daggers:    [1,     1,      0,      2,      1,      1,      0,      0,      3,      0,      1,      1,      2,      2,      1],
    fiddle:     [3,     1,      1,      2,      1,      1,      0,      0,      0,      0,      1,      1,      2,      2,      1],
    fists:      [1,     1,      1,      2,      1,      1,      0,      0,      0,      3,      1,      1,      2,      2,      1],
    kamehameha: [0,     1,      1,      0,      1,      0,      0,      0,      0,      0,      1,      1,      2,      2,      0],
    scythe:     [3,     1,      1,      3,      1,      1,      0,      0,      0,      0,      1,      1,      2,      2,      1],
    sword:      [1,     1,      1,      2,      3,      1,      0,      0,      0,      0,      1,      1,      2,      2,      1],
    warhammer:  [1,     1,      1,      2,      1,      3,      0,      0,      0,      0,      1,      0,      0,      2,      1]
};