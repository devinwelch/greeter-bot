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

        leaderboard.push('');
        leaderboard.push('**Good boys**');
        leaderboard.push('```');
        leaderboard.push(`1. ${ranked[0].Username} (${ranked[0].Worth} GBPs)`);
        leaderboard.push(`2. ${ranked[1].Username} (${ranked[1].Worth} GBPs)`);
        leaderboard.push(`3. ${ranked[2].Username} (${ranked[2].Worth} GBPs)`);
        leaderboard.push('```');
        leaderboard.push('**Bad boys**');
        leaderboard.push('```');
        leaderboard.push(`${l - 2}. ${ranked[l - 3].Username} (${ranked[l - 3].Worth} GBPs)`);
        leaderboard.push(`${l - 1}. ${ranked[l - 2].Username} (${ranked[l - 2].Worth} GBPs)`);
        leaderboard.push(`${l    }. ${ranked[l - 1].Username} (${ranked[l - 1].Worth} GBPs)`);
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