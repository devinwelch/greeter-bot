import weapons from '../rpg/data/weapons.js';
import skills from '../rpg/data/skills.js';
import { pad } from '../utils/pad.js';
import { delay } from '../utils/delay.js';
import { getData } from '../data/getData.js';
import { updateData } from '../data/updateData.js';
import { databaseError } from '../utils/databaseError.js';
import { MessageActionRow, MessageButton } from 'discord.js';

export default {
    name: 'skills',
    description: 'Spend 5/10 points to unlock tier 2/3. 4 lvls = 1 skill point',
    category: 'rpg',
    async execute(client, db, interaction) {
        const message = await getMessage(db, interaction.user.id);
        if (!message) {
            return databaseError(interaction, 'Lvl');
        }

        let items = getUpgradable();

        await interaction.reply(message);
        interaction.message = await interaction.fetchReply();

        const filter = buttonInteraction => 
            buttonInteraction.message === interaction.message &&
            buttonInteraction.user === interaction.user;

        const collector = interaction.channel.createMessageComponentCollector({ filter, idle: 60000 });

        collector.on('collect', async buttonInteraction => {
            const data = await getData(db, interaction.user.id);
            if (!data) {
                collector.stop();
                return;
            }

            const skill = buttonInteraction.customId;
            let extra = null;

            if (getAvailable(data)) {
                if (!data.Skills[skill]) {
                    await buy(db, buttonInteraction.user, skill, data);
                }
                else if(data.Skills[skill] === (items[skill].skillUpgrades || 3)) {
                    extra = "You're already maxed out!";
                }
                else if (skill === 'luck' || skill === 'backpack') {
                    await buy(db, buttonInteraction.user, skill, data);
                }
                else if (data.Skills[skill] === 1 && getSpent(data) < 5) {
                    extra = 'You need to spend 5 skill points before unlocking tier 2 upgrades!';
                }
                else if (data.Skills[skill] === 2 && getSpent(data) < 10) {
                    extra = 'You need to spend 10 skill points before unlocking tier 3 upgrades!';
                }
                else {
                    await buy(db, buttonInteraction.user, skill, data);
                }
            }

            buttonInteraction.update(await getMessage(db, interaction.user.id, extra));
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] });
        });
    }
};

async function getMessage(db, userID, extra) {
    const data = await getData(db, userID);
    if (!data) {
        return null;
    }

    const available = getAvailable(data);
    const upgradable = Object.values(getUpgradable()).filter(item => item.upgrade);
    const owned = upgradable.filter(item => 
        !item.weapon || data.Inventory.some(i => i.type === item.type) || data.Skills[item.type]
    );
    
    const content = getContent(data, available, upgradable, owned, extra);
    const components = getComponents(available, owned);

    return { content: content, components: components };
}

function getContent(data, available, upgradable, owned, extra) {
    const maxLength = Math.max(...owned.map(item => item.name.length)) + 4;
    const response = [];

    response.push(`Skill points available: **${available}**`);
    response.push('Spend 5 points to earn rank 2 weapon upgrades and 10 to unlock rank 3. *Luck* upgrades not restricted.');
    response.push('```');
    response.push(`  ${pad('Skill', maxLength)}Lvl  Description`);
    response.push(`  ${pad('-----', maxLength)}---  -----------`);
    owned.forEach(item => {
        response.push(`• ${pad(item.name, maxLength)}${pad(`${data.Skills[item.type] || 0}/${item.skillUpgrades || 3}`, 5)}${item.upgrade}`);
    });
    response.push('```');

    if (extra) {
        response.push(`**${extra}**`);
    }
    else if (upgradable.length > owned.length) {
        response.push('Unlock more weapons to view their upgrades!');
    }

    return response.join('\n');
}

function getComponents(available, skills) {
    const arrangement = {
         3: [3],
         4: [4],
         5: [5],
         6: [3,3],
         7: [4,3],
         8: [4,4],
         9: [3,3,3],
        10: [5,5],
        11: [4,4,3],
        12: [4,4,4],
        13: [5,4,4],
        14: [5,5,4],
        15: [5,5,5]
    };

    const components = [];
    let count = 0;

    for (let i=0; i<arrangement[skills.length].length; i++) {
        const row = new MessageActionRow();

        for (let j=0; j<arrangement[skills.length][i]; j++) {
            const skill = skills[count];
            const button = new MessageButton()
                .setStyle('SECONDARY')
                .setEmoji(skill.icon || skill.icons[0])
                .setCustomId(skill.type)
                .setDisabled(!available);

            row.addComponents([button]);

            count++;
        }

        components.push(row);
    }

    return components;
}

function getSpent(data) {
    return Object.keys(data.Skills).length ? Object.values(data.Skills).reduce((a, b) => a + b) : 0;
}

function getAvailable(data) {
    return (data.Lvl === 99 ? 20 : Math.floor(data.Lvl / 4)) - getSpent(data);
}

async function buy(db, user, skill, data) {
    const skills = {};
    if (data.Skills[skill]) {
        skills[skill] = data.Skills[skill] + 1;
    }
    else {
        skills[skill] = 1;
    }

    updateData(db, user, { skills: skills });
    await delay(1000);
}

function getUpgradable() {
    return Object.assign({}, weapons, skills);
}