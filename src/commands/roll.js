import { delay } from '../utils/delay.js';
import { getRandom } from '../utils/random.js';

export default {
    name: 'roll',
    description: 'Roll an n-sided die x times',
    category: 'misc',
    options: [{
        type: 3, //STRING
        name: 'dice',
        description: '[x]d<range>',
        required: true
    },
    {
        type: 5, //BOOLEAN
        name: 'fast',
        description: 'Roll without delay',
        required: false
    }],
    async execute(client, db, interaction) {
        let quick = interaction.options.getBoolean('fast');
        let dice = interaction.options.getString('dice');

        if (!/(d?|\d+d)\d+(-\d+)?/.test(dice)) {
            const text = [
                'Invalid format. Here are some examples:',
                '```',
                '/roll 20',
                '/roll 3d6',
                '/roll 5-10',
                '```'
            ].join('\n');

            return interaction.reply({ content: text, ephemeral: true });
        }

        let numberOfRolls = 1;
        if (/\d+d.+/.test(dice)) {
            numberOfRolls = dice.split(/d/)[0];
            if (numberOfRolls > 10) quick = true;
        }
        numberOfRolls = Math.min(numberOfRolls, 100);

        let rollMessage = `${interaction.member.displayName} rolled `;

        const range = dice.replace(/(\d+d|d)/, '').split(/-/);
        const max = range.length === 2 ? Math.floor(Number(range[1])) : Math.floor(Number(range[0]));
        const min = range.length === 2 ? Math.floor(Number(range[0])) : 1;

        if (quick) {
            for(var i = 0; i < numberOfRolls; i++) {
                const roll = getRandom(min, max);
                rollMessage += `**${roll}**`;
                if (i !== numberOfRolls - 1) rollMessage += ',  ';
            }
            return interaction.reply(rollMessage);
        }
        
        await interaction.reply(rollMessage);
    
        while (numberOfRolls-- > 0) {
            const roll = getRandom(min, max);
            let newRoll = ` **${roll}**`;
            if (numberOfRolls !== 0) newRoll += ',  ';

            await delay(1500);
            const message = await interaction.fetchReply();
            await interaction.editReply(message.content + newRoll);
        }
    }
};