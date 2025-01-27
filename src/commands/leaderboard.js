import { commify } from '../utils/commify.js';
import { getRanks } from '../data/getRanks.js';
import { databaseError } from '../utils/databaseError.js';

export default {
    name: 'leaderboard',
    description: 'See who the top Good Boys are',
    category: 'gbp',
    async execute(client, db, interaction) {
        const ranked = await getRanks(db);
        if (!ranked) {
            return databaseError(interaction, 'rank');
        }

        const leaderboard = [];
        const l = ranked.length;
        const amount = 5;

        leaderboard.push('');
        leaderboard.push('**Good boys**');
        leaderboard.push('```');
        for(let i = 0; i < amount; i++)
            leaderboard.push(`${i + 1}. ${ranked[i].Username} (${commify(ranked[i].Worth)} GBPs)`);
        leaderboard.push('```');
        leaderboard.push('**Bad boys**');
        leaderboard.push('```');
        for(let i = amount; i > 0; i--)
            leaderboard.push(`${l - i + 1}. ${ranked[l - i].Username} (${commify(ranked[l - i].Worth)} GBPs)`);
        leaderboard.push('```');

        if (ranked.some(e => e.UserID === interaction.user.id)) {
            const rank = ranked.indexOf(ranked.find(e => e.UserID === interaction.user.id)) + 1;
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

        interaction.reply(leaderboard.join('\n'));
    }
};
