module.exports.Weapon = class {
    constructor(data) {
        this.data = data || {};
        this.weapon = true;

        //ux
        const win = ':w defeated :l!';
        this.set('type');               //type for skills bonus
        this.set('name');               //weapon name literal
        this.set('rarity', 0);          //0:common, 1:rare, 2:epic, 3:legendary, 4: cursed
        this.set('icon', '👌');         //icon to display, emoji or custom ID
        this.set('description');        //item description based on type
        this.set('bonuses', []);        //listed item stat variations
        this.set('win', win);           //victory message
        this.set('lvl', 1);             //lvl requirement
        this.set('id');                 //uuid
        
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
        this.set('lifeSteal', 0);       //% dmg to heal for
        this.set('parry', 0);           //% dmg to return
        this.set('slow');               //boolean, whether to have cooldown after weapon hit
        this.set('recoil', 0);          //% hp recoil dmg on hit
        this.set('discount', 0);        //discount on bananamunition
        this.set('treasureHunter', 0);  //rarer quest loot drops

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
        return [5, 25, 75, 200][this.rarity];
    }

    getRarity() {
        return ['Common', 'Rare', 'Epic', 'Legendary', 'Cursed'][this.rarity];
    }
};

module.exports.enchantingKey = 
['react', 'trhu', 'dmg', 'spd', 'pri', 'insta', 'zerk', 'multi', 'ls', 'parry', 'stun', 'spimin', 'spimax', 'pois', 'sucpun', 'discount'];

module.exports.enchantingTable = {
    //           React  TrHu    Dmg     Spd     Pri     Insta   Zerk    Multi   LS      Parry   Stun    SpiMin  SpiMax  Pois%   SucPun  Discount
    bag:        [2,     2,      2,      2,      1,      0,      0,      0,      0,      1,      0,      3,      3,      0,      0,      0],
    battleaxe:  [2,     2,      2,      2,      1,      1,      3,      1,      2,      1,      1,      0,      0,      0,      0,      0],
    bow:        [2,     2,      2,      2,      0,      1,      1,      3,      2,      1,      1,      0,      0,      0,      0,      0],
    daggers:    [2,     2,      2,      2,      1,      1,      1,      0,      2,      1,      1,      0,      0,      3,      0,      0],
    fiddle:     [2,     2,      2,      2,      1,      3,      1,      1,      2,      1,      1,      0,      0,      0,      0,      0],
    fists:      [2,     2,      2,      2,      1,      1,      1,      1,      2,      1,      1,      0,      0,      0,      3,      0],
    kamehameha: [2,     2,      2,      2,      1,      0,      1,      1,      0,      1,      0,      0,      0,      0,      0,      0],
    scythe:     [2,     2,      2,      2,      1,      3,      1,      1,      3,      1,      1,      0,      0,      0,      0,      0],
    sword:      [2,     2,      2,      2,      1,      1,      1,      1,      2,      3,      1,      0,      0,      0,      0,      0],
    warhammer:  [2,     2,      2,      0,      1,      1,      1,      1,      2,      1,      3,      0,      0,      0,      0,      0],
    treasureGun:[2,     2,      2,      2,      1,      1,      0,      1,      2,      1,      1,      0,      0,      0,      0,      3]
};