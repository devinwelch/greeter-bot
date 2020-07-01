const { getData, updateData } = require('../utils');

module.exports = {
    name: 'unpaws',
    description: 'Remove your rumpaws skill upgrade :(',
    category: 'rpg',
    execute(client, config, db, message, args) {
        getData(db, message.author.id)
        .then(data => {
            if (!data.Responses || !data.Responses.GBPs || !data.Responses.GBPs.length) {
                return;
            }

            const skills = data.Responses.GBPs[0].Skills;

            if (!skills.rumpaws) {
                return;
            }

            const spent = Object.values(skills).reduce((a, b) => a + b) - 1;
            
            if ((Object.keys(skills).some(s => s !== 'luck' && skills[s] === 3) && spent < 11) ||
                (Object.keys(skills).some(s => s !== 'luck' && skills[s] === 2) && spent < 6)) {
                return message.reply("Can't unpaws until you spend more skill points to keep rank 2/3 upgrades.");
            }
            
            updateData(db, message.author, { skills: { rumpaws: 0 }, message: message, emoji: '🐾' });
        });
    }
};