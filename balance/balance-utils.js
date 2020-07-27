const { generateWeapon } = require('../utils');
const { Human } = require('../rpg/classes/human');

module.exports = {
    buildHuman(weapon, skills = 1, lvl = 15, rarity = 1) {
        const options = { chances: [0,0,0,0], plain: true, type: weapon };
        options.chances[rarity] = 1;
    
        const data = {
            Lvl: lvl,
            Inventory: [generateWeapon(lvl, options)],
            Equipped: 0,
            Skills: {}
        };
        data.Skills[weapon] = skills;
    
        return new Human({ displayName: weapon }, data); 
    }
};