import { getRandom } from '../utils/random.js';

/**
 * Returns semi-random order for fighters, based on weapon priority/speed
 * @param party Fighter[]
 * @returns Fighter[]
 */

export function getOrder(party) {
    //get different weapon priorities
    const priorities = [...new Set(party.map(fighter => fighter.weapon.priority))];
    let order = [];

    //randomize order of player per different weapon speed
    priorities.sort((a, b) => b - a).forEach(p => {
        const players = party.filter(user => user.weapon.priority === p);
        order = order.concat(shuffleFighters(players));
    });

    //assign turns
    for(let i = 0; i < order.length; i++) {
        order[i].position = i;
    }
    
    return order;
}

 function shuffleFighters(party) {
    let order = [];
    
    while(party.length) {
        //1-total, defined fighter's speed = 20 + weapon.speed
        const roll = getRandom(1, party.map(fighter => fighter.weapon.speed + 20).reduce((a, b) => a + b));
        let sum = 0;

        for(let i = 0; i < party.length; i++) {
            sum += party[i].weapon.speed + 20;
            if (roll <= sum) {
                order = order.concat(party.splice(i, 1));
                break;
            }
        }
    }

    return order;
}