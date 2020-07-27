const { buildHuman } = require('./balance-utils');
const { selectRandom, format } = require('../utils');
const { fight } = require('../rpg/fight');
const { Boss } = require('../rpg/classes/boss');
const items = require('../rpg/items.json');

const matchCount = 1000;
const results = [];
const weapons = Object.values(items).filter(i => i.weapon && !i.cursed).map(w => w.type);

const type = 2;

const configs = [
    { skills: 0, lvl: 1, rarity: 0 },
    { skills: 1, lvl: 15, rarity: 1 },
    { skills: 2, lvl: 35, rarity: 2 },
    { skills: 3, lvl: 60, rarity: 2 },
    { skills: 3, lvl: 99, rarity: 3 },
];

for (let partySize = 1; partySize <= 10; partySize++) {
    results.push([]);

    for (let c = 0; c < configs.length; c++) {
        const config = configs[c];
        results[partySize - 1].push({ win: 0, loss: 0, tie: 0 });

        for (let match = 0; match < matchCount; match++) {
            const party = [];
            const boss = new Boss(null, config.lvl, partySize, type);
    
            for (let p = 0; p < partySize; p++) {
                const h = buildHuman(selectRandom(weapons), config.skills, config.lvl, config.rarity);
                h.opponents = [boss];
                party.push(h);
            }
    
            boss.opponents = Array.from(party);
            party.push(boss);
    
            fight(null, party);

            if (party.filter(p => p.human).some(h => h.hp > 0)) {
                results[partySize - 1][c].win++;
            }
            else if (party.find(p => p.boss).hp > 0) {
                results[partySize - 1][c].loss++;
            }
            else {
                results[partySize - 1][c].tie++;
            }
        }
    }
}


console.log(`\t${configs.map(c => formatConfig(c)).join('')}`);
for (let partySize = 0; partySize < results.length; partySize++) {
    console.log(`${partySize + 1}\t${results[partySize].map(c => formatResults(c)).join('')}`);
}

function formatConfig(c) {
    return format(`Lvl:${c.lvl} Skl:${c.skills} Rar:${c.rarity}`, 20);
}

function formatResults(c) {
    return format(`${toPercent(c.win)}/${toPercent(c.loss)}/${toPercent(c.tie)}`, 20);
}

function toPercent(n) {
    return (100 * n / matchCount).toFixed(2);
}