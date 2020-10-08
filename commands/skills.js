const { getData, updateData, format } = require('../utils.js');
const items = require('../rpg/items.json');

module.exports = {
    name: 'skills',
    description: 'Spend your skill points earned every 5 levels. Spend 5 points to earn rank 2 weapon upgrades and 10 to unlock rank 3.',
    category: 'rpg',
    aliases: ['skill'],
    usage: '[skill/weapon]',
    execute(client, config, db, message, args) {
        args = args.toLowerCase();
        getData(db, message.author.id)
        .then(data => {
            if (!data.Responses || !data.Responses.GBPs || !data.Responses.GBPs.length) {
                return message.reply('Something went wrong.');
            }

            data = data.Responses.GBPs[0];

            const spent = Object.keys(data.Skills).length ? Object.values(data.Skills).reduce((a, b) => a + b) : 0;
            const available = (data.Lvl === 99 ? 20 : Math.floor(data.Lvl / 5)) - spent;
            const upgradable = Object.values(items).filter(item => item.upgrade);
            const owned = upgradable.filter(item => !item.weapon || data.Inventory.some(i => i.type === item.type) || data.Skills[item.type]);
            const maxLength = Math.max(...owned.map(item => item.name.length)) + 4;

            if (args.length) {
                const skill = (items[args.toLowerCase()] || Object.values(items).find(i => i.name.toLowerCase() === args.toLowerCase())).type;

                if (available <= 0) {
                    message.reply("You don't have any skill points available! Get back to grinding!");
                }
                else if (!owned.map(i => i.type).includes(skill)) {
                    message.reply('Skill not available.');
                }
                else if (!data.Skills[skill]) {
                    buy(db, message, args, data);
                }
                else if(data.Skills[skill] === (items[skill].skillUpgrades || 3)) {
                    message.reply("You're already maxed out!");
                }
                else if (skill === 'luck' || skill === 'backpack') {
                    buy(db, message, args, data);
                }
                else if (data.Skills[skill] === 1 && spent < 5) {
                    message.reply('You need to spend 5 skill points before unlocking tier 2 upgrades!');
                }
                else if (data.Skills[skill] === 2 && spent < 10) {
                    message.reply('You need to spend 10 skill points before unlocking tier 3 upgrades!');
                }
                else {
                    buy(db, message, skill, data);
                }
            }
            else {
                const response = [];
                response.push(`Skill points available: **${available}**`);
                response.push('Spend 5 points to earn rank 2 weapon upgrades and 10 to unlock rank 3. *Luck* upgrades not restricted.');
                response.push('```');
                response.push(`  ${format('Skill', maxLength - 2)}Lvl  Description`);
                response.push(`  ${format('-----', maxLength - 2)}---  -----------`);
                    
                owned.forEach(item => {
                    response.push(`• ${format(item.name, 16)}${format(`${data.Skills[item.type] || 0}/${item.skillUpgrades || 3}`, 5)}${item.upgrade}`);
                });
                response.push('```');
                
                if (upgradable.length > owned.length) {
                    response.push('Unlock more weapons to view their upgrades!');
                }

                message.reply(response);
            }
        });
    }
};

function buy(db, message, skill, data) {
    const skills = {};
    if (data.Skills[skill]) {
        skills[skill] = data.Skills[skill] + 1;
    }
    else {
        skills[skill] = 1;
    }
    updateData(db, message.author, { skills: skills, message: message, emoji: '🦿' });
}