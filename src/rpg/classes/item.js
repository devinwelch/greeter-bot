import items from '../data/items.js';

export class Item {
    constructor(data) {
        this.item = true;

        this.id = data.id;
        const i = items[data.type];
        
        this.type = i.type;
        this.name = i.name;
        this.icon = i.icon;
        this.cost = i.cost;
        this.description = i.description;
    }

    toString(client, sell = true) {        
        return [
            `**${this.name}** ${client.emojis.resolve(this.icon)}`,
            `Description: ${this.description}`,
            `${sell ? 'Sells for' : 'Cost'}: ${this.sell()} GBPs`
        ].join('\n');
    }

    sell() {
        return Math.round((this.cost || 1000) / 5);
    }
}