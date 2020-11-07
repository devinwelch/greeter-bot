const config = require('../../config.json');

module.exports.Tile = class {
    constructor(x, y) {
        this.x = x;
        this.y = y;

        this.toEmpty();
    }

    toFighter(fighter) {
        fighter.x = this.x;
        fighter.y = this.y;
        this.occupied = fighter;
        this.icon = fighter.icon;
    }

    toFort() {
        this.occupied = true;
        this.icon = '🟫';
        this.fort = true;
    }

    toStick() {
        this.occupied = false;
        this.icon = '🌿';
    }

    toEmpty() {
        this.occupied = false;
        this.icon = '¯¯¯';
    }

    takeDmg(dmg) {
        if (this.occupied && !isNaN(this.occupied)) {
            this.occupied -= dmg;
            if (this.occupied <= 0) {
                this.toEmpty();
            }
        }
    }

    toString(client) {
        return this.temp ||
        ((this.occupied && this.occupied.fighter)
            ? this.occupied.getIcon(client, config)
            : this.icon
        );
    }

    getWeight() {
        if (!this.occupied) {
            return 1;
        }

        if (this.occupied.nonplayer) {
            return Math.ceil(this.occupied.hp / 50) * 2;
        }

        return 0;
    }

    isEnemy() {
        return this.occupied && this.occupied.enemy;
    }
};