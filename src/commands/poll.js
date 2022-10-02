import { MessageActionRow, MessageButton, MessageSelectMenu } from 'discord.js';
import { pad } from '../utils/pad.js';

export default {
    name: 'poll',
    description: 'Create a poll with 2-9 options',
    category: 'misc',
    options: [{
        type: 3, //STRING
        name: 'question',
        description: 'The question you are polling',
        required: true
    },
    {
        type: 3, //STRING
        name: 'option-1',
        description: '100 character limit',
        required: true
    },
    {
        type: 3, //STRING
        name: 'option-2',
        description: '100 character limit',
        required: true
    },
    {
        type: 3, //STRING
        name: 'option-3',
        description: '100 character limit',
        required: false
    },
    {
        type: 3, //STRING
        name: 'option-4',
        description: '100 character limit',
        required: false
    },
    {
        type: 3, //STRING
        name: 'option-5',
        description: '100 character limit',
        required: false
    },
    {
        type: 3, //STRING
        name: 'option-6',
        description: '100 character limit',
        required: false
    },
    {
        type: 3, //STRING
        name: 'option-7',
        description: '100 character limit',
        required: false
    },
    {
        type: 3, //STRING
        name: 'option-8',
        description: '100 character limit',
        required: false
    },
    {
        type: 3, //STRING
        name: 'option-9',
        description: '100 character limit',
        required: false
    }],
    async execute(client, db, interaction) {
        const row1 = new MessageActionRow();
        const row2 = new MessageActionRow();
        const menu = new MessageSelectMenu()
            .setCustomId('menu');
        const end = new MessageButton()
            .setCustomId('end')
            .setLabel('End Poll')
            .setStyle('SECONDARY');
        const send = new MessageButton()
            .setCustomId('send')
            .setLabel('Submit')
            .setStyle('PRIMARY');

        const results = {}; 

        for (let i=0; i<=10; i++) {
            const option = interaction.options.getString(`option-${i}`);
            if (option) {
                menu.addOptions([{
                    label: option,
                    value: i.toString(),
                    default: i == 0
                }]);

                results[i.toString()] = { option: option, votes: [] };
            }
        }

        row1.addComponents([menu]);
        row2.addComponents([end, send]);

        let question = interaction.options.getString('question');
        if (!question.endsWith('?')) {
            question += '?';
        }

        const poll = `**${question}**`;
        await interaction.reply({ content: poll, components: [row1, row2]});
        interaction.message = await interaction.fetchReply();

        const selected = {};
        const filter = componentInteraction => componentInteraction.message === interaction.message;
        const collector = interaction.channel.createMessageComponentCollector({ filter });

        collector.on('collect', async componentInteraction => {
            if (componentInteraction.isSelectMenu()) {
                selected[componentInteraction.user.id] = componentInteraction.values[0];
                componentInteraction.deferUpdate();
            }
            else if (componentInteraction.customId === 'end' && componentInteraction.user === interaction.user) {
                componentInteraction.deferUpdate();
                collector.stop();
            }
            else if (selected[componentInteraction.user.id]) {
                //remove previous vote
                Object.values(results).forEach(result => {
                    const index = result.votes.indexOf(componentInteraction.user);
                    if (index > -1) {
                        result.votes.splice(index, 1);
                    }
                });

                //record vote
                const vote = selected[componentInteraction.user.id];
                results[vote].votes.push(componentInteraction.user);

                componentInteraction.update({ content: formatText(poll, results)});
            }
            else {
                componentInteraction.deferUpdate();
            }
        });

        collector.on('end', () => {
            interaction.message.edit({ content: formatText(poll, results), components: []});
        });
    }
};

function formatText(poll, results) {
    const text = [poll];
    const values = Object.values(results);

    const total = values.reduce((a, b) => a + b.votes.length, 0);
    const maxLength = Math.min(Math.max(...values.map(value => value.option.length)), 100);

    for (let i=1; i <= values.length; i++) {
        const result = values[i-1];
        let line = `\`${i}. ${pad(result.option, maxLength)} `;

        const portion = Math.round(20 * result.votes.length / total); 
        line += pad('▬'.repeat(portion), 20);

        line += '` ';

        line += result.votes.map(user => user.toString()).join(', ');

        text.push(line);
    }

    return text.join('\n');
}