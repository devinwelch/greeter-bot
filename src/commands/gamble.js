import { delay } from '../utils/delay.js';
import { getData } from '../data/getData.js';
import { getRandom } from '../utils/random.js';
import { updateData } from '../data/updateData.js';
import { databaseError } from '../utils/databaseError.js';

export default {
    name: 'gamble',
    description: 'Gamble with your GBPs. Roll 1-100, higher than 55 wins! Hit 100 for jackpot!',
    category: 'gbp',
    options: [
    {
        type: 1, //SUB_COMMAND
        name: 'amount',
        description: 'Specify an amount of GBPs',
        options: [
        {
            type: 4, //INTEGER
            name: 'gbps',
            description: 'Number of GBPs',
            required: true,
        }],
    },
    {
        type: 1, //SUB_COMMAND
        name: 'max',
        description: '1-800-589-9966'
    }],
    async execute(client, db, interaction) {
        const data = await getData(db, interaction.user.id);
        if (!data) {
            return databaseError(interaction, 'GBP');
        }

        const wager = interaction.options.getSubcommand() === 'max' ? data.GBPs : interaction.options.getInteger('gbps');

        if (wager < 1) {
            interaction.reply( 'Get your dirty money out of here.');
        }
        else if (wager > data.GBPs) {
            interaction.reply(`Ez there sport, you only have ${data.GBPs} GBPs!`);
        }
        else {
            const low = data.Skills.luck ? 2 * data.Skills.luck : 1;
            const roll = getRandom(low, 100);
            let resultMessage, win;

            if (roll === 100) {
                const bonus = Math.max(data.Skills.luck ? data.Skills.luck : 2, getRandom(2, 5));
                win = bonus * wager;
                resultMessage = `\nYou win big! ${bonus}x multiplier! (${win.toLocaleString('en-US')} GBPs)`;
            }
            else if (roll > 55) {
                resultMessage = `\nYou win ${wager.toLocaleString('en-US')} GBPs!`;
                win = wager;
            }
            else {
                resultMessage = `\nYou lose ${wager.toLocaleString('en-US')} GBPs.`;
                win = -wager;
            }

            const rollMessage = `Higher than 55 wins. ${interaction.user.username} rolled: `;
            await interaction.reply(rollMessage);
            await delay(5000).then(async () => {
                interaction.editReply(rollMessage + roll + resultMessage);
            }).catch(console.error);

            updateData(db, interaction.user, { gbps: win });
            updateData(db, client.user, { gbps: -win });
        }
    }
};