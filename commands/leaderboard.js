const { getRanks } = require('../utils');

module.exports = {
    name: 'leaderboard',
    aliases: ['rank'],
    description: 'See list of goodest boys on the server',
    category: 'gbp',
    execute: async function(client, config, db, message, args) {
        const sorted = await getRanks(db);
        if (!sorted) {
            return;
        }

        const leaderboard = [];
        const l = sorted.length;

        leaderboard.push('');
        leaderboard.push('**Good boys**');
        leaderboard.push('```');
        leaderboard.push(`1. ${sorted[0].Username} (${sorted[0].Worth} GBPs)`);
        leaderboard.push(`2. ${sorted[1].Username} (${sorted[1].Worth} GBPs)`);
        leaderboard.push(`3. ${sorted[2].Username} (${sorted[2].Worth} GBPs)`);
        leaderboard.push('```');
        leaderboard.push('**Bad boys**');
        leaderboard.push('```');
        leaderboard.push(`${l - 2}. ${sorted[l - 3].Username} (${sorted[l - 3].Worth} GBPs)`);
        leaderboard.push(`${l - 1}. ${sorted[l - 2].Username} (${sorted[l - 2].Worth} GBPs)`);
        leaderboard.push(`${l    }. ${sorted[l - 1].Username} (${sorted[l - 1].Worth} GBPs)`);
        leaderboard.push('```');

        if (sorted.some(e => e.UserID === message.author.id)) {
            const rank = sorted.indexOf(sorted.find(e => e.UserID === message.author.id)) + 1;
            let judgment = '';
            if (rank === 69) {
                judgment = '*Nice.*';
            }
            else if (l - rank === 0) {
                judgment = 'Shameful.';
            }
            else if (l - rank <= 10) {
                judgment = 'I know you can be better.';
            }
            else if (rank === 1) {
                judgment = 'Wow, congrats!';
            }
            else if (rank <= 10) {
                judgment = 'Cool!';
            }

            leaderboard.push(`You rank ${rank}/${l}. ${judgment}`);
        }

        message.reply(leaderboard);
    }
};