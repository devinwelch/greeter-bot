const { getRandom } = require('../../utils');
const { Graph } = require('../astar');
const { Tile } = require('./tile');
const { Tree } = require('./nonplayer');

module.exports.Board = class {
    constructor(party, bananas) {
        //swarm stats
        this.stats = {
            enemies: 0,
            xp: 0
        };

        //map size
        this.height = 15;
        this.width  = 15;

        //initialize board with empty tiles
        for (let y = 1; y <= this.height; y++) {
            for (let x = 1; x <= this.width; x++) {
                if (!this[x]) {
                    this[x] = {};
                }
                this[x][y] = new Tile(x, y);
            }
        }

        //trees
        const trees = Math.ceil(this.width * this.height / 4);
        for (let i = 0; i < trees; i++) {
            this.getRandomTile().toFighter(new Tree(100));
        }

        //fort
        for (let x = 5; x <= 11; x++) {
            for (let y = 5; y <= 11; y++) {
                this[x][y].toEmpty();
            }
        }

        let layout = [
            [5 ,5 ], [6 ,5 ], [5 ,6 ],
            [10,5 ], [11,5 ], [11,6 ],
            [5 ,10], [5 ,11], [6 ,11],
            [11,10], [11,11], [10,11]
        ];

        if (party.length < 6) {
            layout = layout.concat([[7,5], [11,7], [9,11], [5,9]]);
            if (party.length < 3) {
                layout = layout.concat([[5,7], [9,5], [11,9], [7,11]]);
            }
        }

        layout.forEach(coord => this[coord[0]][coord[1]].toFort());

        //nanner nexus
        this[8][8].toFighter(bananas);

        //players
        const colors = ['🔴','🔵','🟢','🟡','🟣','🟤','🟠','♾️'];
        let playerCount = 0;
        party.forEach(p => {
            p.icon = colors[playerCount++];
            const tile = this.getRandomTile(6, 10);
            tile.toFighter(p);
            p.x = tile.x;
            p.y = tile.y;
        });
    }

    //move a character
    moveFighter(to, from) {
        let resource;

        if (to === from) {
            return;
        }

        if (!to.occupied) {
            if (to.icon === '💊') {
                const heal = Math.min(from.occupied.max - from.occupied.hp, from.occupied.max * 0.25);
                from.occupied.hp += heal;
                resource = { type: '💊', amount: heal };
            }
            else if (to.icon === '🌿') {
                from.occupied.wood = from.occupied.wood || 0;
                from.occupied.wood++;
                resource = { type: '🌿', amount: 1 };
            }
            else if (to.icon === '💰') {
                resource = { type: '💰', amount: getRandom(1, 50) };
            }
        }

        from.occupied.x = to.x;
        from.occupied.y = to.y;

        to.toFighter(from.occupied);
        from.toEmpty();

        return resource;
    }

    //gets a random blank tile within specified height range
    getRandomTile(minHeight = 1, maxHeight = this.height) {
        let x;
        let y;

        //Best:  O(1)
        //Worst: O(∞) lmao
        do {
            x = getRandom(1, this.width);
            y = getRandom(minHeight, maxHeight);
        } 
        while (this[x][y].occupied);

        return this[x][y];
    }

    //returns array of tiles adjacent/surrounding origin
    getSurrounding(x, y, diagonal) {
        const surrounding = [];

        if (x < 1 || y < 1 || x > this.width || y > this.height) {
            return surrounding;
        }
        
        if (x - 1 >= 1)
            surrounding.push(this[x-1][y]);
        if (x + 1 <= this.width)
            surrounding.push(this[x+1][y]);
        if (y - 1 >= 1)
            surrounding.push(this[x][y-1]);
        if (y + 1 <= this.height)
            surrounding.push(this[x][y+1]);

        if (diagonal) {
            if (x - 1 >= 1 && y - 1 >= 1)
                surrounding.push(this[x-1][y-1]);
            if (x - 1 >= 1 && y + 1 <= this.height)
                surrounding.push(this[x-1][y+1]);
            if (x + 1 <= this.width && y - 1 >= 1)
                surrounding.push(this[x+1][y-1]);
            if (x + 1 <= this.width && y + 1 <= this.height)
                surrounding.push(this[x+1][y+1]);
        }

        return surrounding;
    }

    toString(client) {
        let board = '';

        for (let y = 1; y <= this.height; y++) {
            board += '\n';
            for (let x = 1; x <= this.width; x++) {
                board += this[x][y].toString(client);
            }
        }

        return board;
    }

    display(client) {
        const arr = [];

        for (let y = 1; y <= this.height; y++) {
            let row = '';
            for (let x = 1; x <= this.width; x++) {
                row += this[x][y].toString(client);
            }
            arr.push(row);
        }

        return arr;
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
                row.push(this[x][y].getWeight());
            }
            graph.push(row);
        }

        return new Graph(graph);
    }

    getPerimeter() {
        const perimeter = [];
        for (let x = 1; x <= this.width; x++) {
            perimeter.push(this[x][1]);
            perimeter.push(this[x][this.height]);
        }
        for (let y = 2; y <= this.height - 2; y++) {
            perimeter.push(this[1][y]);
            perimeter.push(this[this.width][y]);
        }

        return perimeter;
    }

    clearTemp() {
        for (let x = 1; x <= this.width; x++) {
            for (let y = 1; y <= this.height; y++) {
                this[x][y].temp = null;
            }
        }
    }
};