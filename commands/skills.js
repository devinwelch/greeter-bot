const { getData, updateData, format } = require('../utils.js');
const items = require('./items.json');

module.exports = {
    name: 'skills',
    description: 'Spend your skill points earned every 5 levels. Spend 5 points to earn rank 2 weapon upgrades and 10 to unlock rank 3.',
    aliases: [''],
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
            const owned = upgradable.filter(item => Object.keys(data.Inventory).filter(i => data.Inventory[i]).includes(item.name));

            if (args.length) {
                if (available <= 0) {
                    message.reply("You don't have any skill points available! Get back to grinding!");
                }
                else if (args !== 'luck' && !owned.map(i => i.name).includes(args)) {
                    message.reply('Skill not available.');
                }
                else if (!data.Skills[args]) {
                    buy(db, message, args, data);
                }
                else if ((args === 'luck' && data.Skills.luck === 5) || (args !== 'luck' && data.Skills[args] === 3)) {
                    message.reply("You're already maxed out!");
                }
                else if (args === 'luck') {
                    buy(db, message, args, data);
                }
                else if (data.Skills[args] === 1 && spent < 5) {
                    message.reply('You need to spend 5 skill points before unlocking tier 2 upgrades!');
                }
                else if (data.Skills[args] === 2 && spent < 10) {
                    message.reply('You need to spend 10 skill points before unlocking tier 3 upgrades!');
                }
                else {
                    buy(db, message, args, data);
                }
            }
            else {
                const response = [];
                response.push(`Skill points available: **${available}**`);
                response.push('Spend 5 points to earn rank 2 weapon upgrades and 10 to unlock rank 3. *Luck* upgrades not restricted.');
                response.push('```');
                response.push('  Skill      Lvl  Description');
                response.push('  -----      ---  -----------');
                    
                owned.forEach(item => {
                    response.push(`• ${format(item.name, 11)}${format(`${data.Skills[item.name] || 0}/3`, 5)}${item.upgrade}`);
                });
                response.push(format('• luck', 13) + format(`${data.Skills.luck || 0}/5`, 5) + "Don't like fighting? Increase your odds when you gamble!");
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