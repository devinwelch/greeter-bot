const { selectRandom } = require('../../utils');
const { Fighter } = require('./fighter');
const { Weapon } = require('./weapon');

const Nonplayer = module.exports.Nonplayer = class extends Fighter {
    constructor(hp) {
        super(1);

        this.nonplayer = true;
        this.max = hp;
        this.hp = this.max;
        this.weapon = new Weapon();
    }
};

module.exports.Bananas = class extends Nonplayer {
    constructor(hp) {
        super(hp);

        this.bananas = true;
        this.name = 'Banana Hoard';
        this.icon = '🍌';
    }

    getIcon(client, config) {
        const health = this.hp > this.max / 2
            ? 0
            : this.hp > this.max / 4
                ? 1
                : 2;

        return client.emojis.resolve(config.ids.bananas[health]).toString();
    }
};

module.exports.Tree = class extends Nonplayer {
    constructor(hp) {
        super(hp);

        this.wall = true;
        this.name = 'the tree';
        this.icon = selectRandom(['🌳', '🌲', '🌴']);
    }
};

module.exports.Wall = class extends Nonplayer {
    constructor(hp) {
        super(hp);

        this.wall = true;
        this.name = 'the wall';
        this.icon = '🪵';
    }
};