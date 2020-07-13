const { getRandom, selectRandom } = require('../../utils');
const { Graph } = require('../astar');
const { Tile } = require('./tile');

module.exports.Board = class {
    constructor(party) {
        const colors = [
            '🔴', '🟢', '🟡', '🟣', '🟤', '🟠',
            '🟥', '🟩', '🟨', '🟪', '🟫', '🟧'
        ];
        let playerCount = 0;

        const partySize = Math.round(party.length / 2);
        this.height = 2 * Math.min(10, partySize + 2);
        this.width  = 2 * Math.min(10, 2 * partySize + 1);

        //each tile represented by an icon
        for (let y = 1; y <= this.height; y++) {
            for (let x = 1; x <= this.width; x++) {
                if (!this[x]) {
                    this[x] = {};
                }
                this[x][y] = new Tile(x, y);
            }
        }

        //generate a body of water
        const source = this.getRandomTile(Math.floor(this.height / 3) + 1, Math.ceil(this.height * 2 / 3));
        this[source.x][source.y].toWater();
        const lakeSize = 2 * partySize;
        for (let i = 0; i < lakeSize; i++) {
            selectRandom(this.getCoast()).toWater();
        }

        //add each fighter/enemy to bottom/top of board
        party.forEach(p => {
            p.icon = p.enemy
                ? '🦄'
                : colors[playerCount++];

            const tile = p.enemy
                ? this.getRandomTile(1, Math.floor(this.height / 3))
                : this.getRandomTile(Math.ceil(this.height * 2 / 3) + 1);

            tile.toFighter(p);

            p.x = tile.x;
            p.y = tile.y;
        });

        //add trees
        const trees = Math.ceil(this.width * this.height / 10);
        for (let i = 0; i < trees; i++) {
            this.getRandomTile().toTree();
        }

        //randdom chance for loot
        const loot = Math.ceil(partySize / 2);
        for (let i = 0; i < loot; i++) {
            if (!getRandom(2)) {
                this.getRandomTile().icon = '💰';
            }

            if (!getRandom(2)) {
                this.getRandomTile().icon = '🎁';
            }
        }
    }

    //clear temporary icon overlays
    clearTemp() {
        for (let y = 1; y <= this.height; y++) {
            for (let x = 1; x <= this.width; x++) {
                this[x][y].clear();
            }
        }
    }

    //move a character
    moveFighter(to, from) {
        if (to === from) {
            return;
        }

        if (to.icon === '💰') {
            from.occupied.money++;
            from.occupied.money = 1;
        }

        if (to.icon === '🎁') {
            from.occupied.presents++;
        }

        from.occupied.x = to.x;
        from.occupied.y = to.y;

        to.toFighter(from.occupied);
        from.toEmpty();
    }

    //gets a random blank tile within specified height range
    getRandomTile(minHeight = 1, maxHeight = this.height) {
        let x;
        let y;

        //Best: O(1)
        //Worst: O(∞) lmao
        do {
            x = getRandom(1, this.width);
            y = getRandom(minHeight, maxHeight);
        } 
        while (this[x][y].occupied);

        return this[x][y];
    }

    //return array of coastal tiles, weighted towards tiles surrounded by water
    getCoast() {
        const coast = [];

        for (let y = 1; y <= this.height; y++) {
            for (let x = 1; x <= this.width; x++) {
                if (this[x][y].water) {
                    this.getSurrounding(x, y).forEach(a => {
                        if (!a.water) {
                            const count = this.getSurrounding(a.x, a.y).filter(c => c.water).length;
                            for(let i = 0; i < 2 ** count; i++) {
                                coast.push(this[a.x][a.y]);
                            }
                        }
                    });
                }   
            }
        }

        return coast;
    }

    //returns array of tiles surrounding defined origin
    getSurrounding(x, y, options) {
        const surrounding = [];

        for (let i = -1; i <= 1; i++) {
            for(let j = -1; j <= 1; j++) {
                if (i === 0 && j === 0) {
                    continue;
                }

                const newX = x + i;
                const newY = y + j;

                if (newX > 0 && newX <= this.width &&
                    newY > 0 && newY <= this.height) 
                {
                    surrounding.push(this[newX][newY]);
                }
            }
        }

        if (options && options.far) {
            if (x + 2 <= this.width)  surrounding.push(this[x + 2][y]);
            if (x - 2 > 0)            surrounding.push(this[x - 2][y]);
            if (y + 2 <= this.height) surrounding.push(this[x][y + 2]);
            if (y - 2 > 0)            surrounding.push(this[x][y - 2]);
        }

        return surrounding;
    }

    toString() {
        const rows = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        const double = this.height > 10;

        let board = double ? '🟦🟦' : '🟦';
        for (let i = 0; i < this.width; i++) {
            board += `:regional_indicator_${String.fromCharCode(97 + i)}:`;
        }

        for (let y = 1; y <= this.height; y++) {
            const row = double ? this.getDouble(rows, y) : rows[y];
            board += '\n' + row;
            for (let x = 1; x <= this.width; x++) {
                board += this[x][y].toString();
            }
        }

        return board;
    }

    getDouble(arr, n) {
        if (n < 10) {
            return arr[0] + arr[n];
        }

        const s = n.toString();
        return arr[Number(s[0])] + arr[Number(s[1])];
    }

    getGraph() {
        const graph = []; 

        for (let x = 0; x <= this.width; x++) {
            const row = [];
            for (let y = 0; y <= this.height; y++) {
                if (!x || !y) {
                    row.push(0);
                    continue;
                }
                
                row.push(this[x][y].occupied ? 0 : 1);
            }
            graph.push(row);
        }

        return new Graph(graph, { diagonal: true });
    }
};