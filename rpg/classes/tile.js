const { selectRandom } = require('../../utils');

module.exports.Tile = class {
    constructor(x, y) {
        this.x = x;
        this.y = y;

        this.toEmpty();
    }

    toEmpty() {
        this.occupied = false;
        this.flat = true;
        this.icon = '¯¯¯'; //~same size as emoji on desktop, other options: ▫,⠀⠀,⬜

        this.water = false;
        this.tree = false;
    }

    toWater() {
        this.occupied = true;
        this.flat = true;
        this.icon = '🟦'; //other option: 🌊

        this.water = true;
        this.tree = false;
    }

    toTree() {
        this.occupied = true;
        this.flat = false;
        this.icon = selectRandom(['🌳', '🌲', '🌴']);

        this.water = false;
        this.tree = true;
    }

    toFighter(fighter) {
        this.occupied = fighter;
        this.flat = false;
        this.icon = fighter.icon;

        this.water = false;
        this.tree = false;
    }

    toCrater() {
        this.occupied = true;
        this.flat = true;
        this.icon = '🕳';

        this.water = false;
        this.tree = false;
    }

    clear() {
        this.temp = null;
    }

    toString() {
        if (this.temp) {
            return this.temp;
        }

        if (this.occupied && this.occupied.fighter && this.occupied.hp <= 0) {
            return '☠️';
        }

        return this.icon;
    }
};