import { selectRandom } from '../../utils/random.js';
import { Fighter } from './fighter.js';
import { Weapon } from './weapon.js';

const Nonplayer = module.exports.Nonplayer = class extends Fighter {
    constructor(hp) {
        super(1);

        this.nonplayer = true;
        this.max = hp;
        this.hp = this.max;
        this.weapon = new Weapon();
    }
};

export class Bananas extends Nonplayer {
    constructor(hp) {
        super(hp);

        this.bananas = true;
        this.name = 'Banana Hoard';
        this.icon = '🍌';
    }

    getIcon(client) {
        const health = this.hp > this.max / 2
            ? 0
            : this.hp > this.max / 4
                ? 1
                : 2;

        return client.emojis.resolve(client.ids.emojis.bananas[health]).toString();
    }
}

export class Tree extends Nonplayer {
    constructor(hp) {
        super(hp);

        this.wall = true;
        this.name = 'the tree';
        this.icon = selectRandom(['🌳', '🌲', '🌴']);
    }
}

export class Wall extends Nonplayer {
    constructor(hp) {
        super(hp);

        this.wall = true;
        this.name = 'the wall';
        this.icon = '🪵';
    }
}