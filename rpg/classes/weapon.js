module.exports.Weapon = class {
    constructor(data) {
        this.data = data || {};
        this.weapon = true;

        //ux
        const win = ':w defeated :l!';
        this.set('type');               //type for skills bonus
        this.set('name');               //weapon name literal
        this.set('rarity', 0);          //0:common, 1:rare, 2:epic, 3:legendary
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
        this.set('recoil', 0);          //flat recoil dmg on hit

        delete this.data;
    }

    set(stat, def) {
        this[stat] = this.data[stat] || def;
    }

    isEpic() {
        return this.rarity > 1;
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
        return ['Common', 'Rare', 'Epic', 'Legendary'][this.rarity];
    }
};