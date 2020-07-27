const { buildHuman } = require('./balance-utils');
const { format } = require('../utils');
const { fight } = require('../rpg/fight');
const items = require('../rpg/items.json');

const results = {};
const weapons = Object.values(items).filter(i => i.weapon && !i.cursed).map(w => w.type);

for (let x = 0; x < weapons.length; x++) {
    for (let y = 0; y < weapons.length; y++) {
        let wins = 0, loss = 0, ties = 0;
        let f1, f2;

        for (let z = 0; z < 1000; z++) {
            f1 = buildHuman(weapons[x]);
            f2 = buildHuman(weapons[y]);

            f1.opponents = [f2];
            f2.opponents = [f1];

            fight(null, [f1, f2]);

            if (f1.hp > 0) {
                wins++;
            }
            else if (f2.hp > 0) {
                loss++;
            }
            else {
                ties++;
            }
        }

        if (!results[f1.name]) {
            results[f1.name] = {};
        }
        results[f1.name][f2.name] = (x === y)
            ? null
            : {
                wins: wins,
                loss: loss,
                ties: ties,
                rate: 100 * wins / (wins + loss)
            };
    }
}

const length = 6;

const chart = [];
chart.push(['      '].concat(Object.keys(results).map(weapon => format(weapon.substr(0, 4), length))).join('') + '\tavg');
Object.keys(results).forEach(p1 => {
    let row = format(p1.substr(0, 4), length);
    
    Object.keys(results[p1]).forEach(p2 => {
        const r = results[p1][p2];
        row += format(r ? r.rate.toFixed(1) : '', length);
    });

    const l = Object.values(results[p1]).filter(r => r).length;
    const average = Object.values(results[p1]).filter(r => r).map(r => r.rate).reduce((a, b) => a + b) / l;
    row += `\t${average.toFixed(1)}`;

    chart.push(row);
});

console.log(chart.join('\n'));