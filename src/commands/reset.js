import { MessageActionRow, MessageButton } from 'discord.js';
import { databaseError } from '../utils/databaseError.js';
import { getRanks } from '../data/getRanks.js';

export default {
    name: 'reset',
    description: 'If top 3 Good Boys™ concur, all user GBPs are set to 0 at midnight EST. Max 1 reset per week',
    category: 'gbp',
    async execute(client, db, interaction) {
        try {
            const resetData = await db.scan({ TableName: 'Resets' }).promise();
            const week = 1000 * 60 * 60 * 24 * 7;
            const now = new Date(Date.now());
            const recent = resetData.Items.filter(reset => now < new Date(Date.parse(reset.Date) + week));
    
            if (recent.length) {
                if (recent.some(e => !e.Executed)) {
                    return interaction.reply("There is a reset scheduled for tonight! It's anarchy until then!");
                }
                else {
                    const mostRecent = new Date(recent.sort((function(a, b) { return new Date(b.Date) - new Date(a.Date); }))[0].Date)
                        .toLocaleString('en-US', { timeZone: client.timezone });
                    return interaction.reply(`Please wait at least a week before the next reset. The last one was on ${mostRecent}.`);
                }
            }
    
            let data = await getRanks(db);
            
            if (!data) {
                return;
            }
            
            if (!(await getMember(interaction, data[0])) ||
                !(await getMember(interaction, data[1])) ||
                !(await getMember(interaction, data[2]))  )
            {
                return interaction.reply('Not all good boys are here right now!');
            }
            
            const text = [];
            text.push(`${interaction.member.displayName} is calling for an economy reset!`);
            text.push(`${await getName(client, interaction, data[0])}, ${await getName(client, interaction, data[1])}, ${await getName(client, interaction, data[2])}:`);
            text.push('We need your unanimous concurrence for the motion to pass. You have 5 minutes to decide.');

            const drops = client.emojis.resolve(client.ids.emojis.drops) || '😂';

            const buttons = new MessageActionRow().addComponents([
                new MessageButton()
                    .setLabel('🦀 RESET 🦀')
                    .setStyle('DANGER')
                    .setCustomId('reset'),
                new MessageButton()
                    .setLabel(`${drops} LOL NO ${drops}`)
                    .setStyle('PRIMARY')
                    .setCustomId('nope')
            ]);

            await interaction.reply({ content: text.join('\n'), components: [buttons] });
            interaction.messageID = (await interaction.fetchReply()).id;
            
            client.resets.push(interaction.user.id);
    
            const filter = buttonInteraction => buttonInteraction.message.id === interaction.messageID;

            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 300000 });

            let pass = false;
            const crabs = new Set();
            const lords = new Set();

            crabs.add('388080318487199745');
    
            collector.on('collect', buttonInteraction => {
                if (buttonInteraction.customId === 'reset') {
                    crabs.add(buttonInteraction.user.id);
                    lords.delete(buttonInteraction.user.id);

                    if (crabs.has(data[0].UserID) &&
                        crabs.has(data[1].UserID) &&
                        crabs.has(data[2].UserID))
                    {
                        pass = true;
                        scheduleReset(db, data, interaction);
                        collector.stop();
                    }
                }
                else {
                    lords.add(buttonInteraction.user.id);
                    crabs.delete(buttonInteraction.user.id);
                }

                const newText = [...text];
                newText.push(`\n*Crabs:* ${Array.from(crabs).map(id => interaction.guild.members.resolve(id)).join(', ')}`);
                newText.push(`\n*Lords:* ${Array.from(lords).map(id => interaction.guild.members.resolve(id)).join(', ')}`);

                buttonInteraction.update({ content: newText.join('\n') });
            });
    
            collector.on('end', function() {
                interaction.editReply({ components: [] });

                if (!pass) {
                    interaction.followUp('**The motion failed. Please continue to be good boys.**');
                }
            }); 
        }
        catch (err) {
            console.log(err);
            interaction.reply({ content: 'Something went wrong.', ephemeral: true });
        }
    }
};
    
async function getMember(interaction, user) {
    try {
        return await interaction.guild.members.fetch(user.UserID).catch(() => null);
    }
    catch (error) {
        console.error(error);
    }
}

async function getName(client, interaction, user) {
    if (client.resets.includes(interaction.user.id)) {
        return user.Username;
    }

    return await getMember(interaction, user);
}

function scheduleReset(db, data, interaction) {
    const economy = {};
    data.forEach(e => { 
        economy[e.UserID] = {
            GBPs: e.Worth,
            HighScore: e.HighScore
        };
    });

    console.log(economy);

    const params = {
        TableName: 'Resets',
        Item: {
            'Date': new Date(Date.now()).toString(),
            'Executed': false,
            'Economy': economy
        }
    };

    db.put(params, function(err) {
        if (err) {
            console.error('Unable to schedule reset. Error:', JSON.stringify(err, null, 2));
            interaction.followUp('Unable to schedule reset. Please try again.');
        }
        else {
            console.log('Reset scheduled');
            interaction.followUp('@everyone **The motion passed and the reset will occur at midnight EST. Visit the shop and go wild until tomorrow, then be on your best behavior!**');
        }
    });
}