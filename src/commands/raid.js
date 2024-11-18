import { MessageActionRow, MessageButton } from 'discord.js';
import { getChance, selectRandom } from '../utils/random.js';
import { generateWeapon } from '../rpg/generateWeapon.js';
import { addToInventory } from '../rpg/addToInventory.js';
import { updateData } from '../data/updateData.js';
import { fight, display } from '../rpg/fight.js';
import { Human } from '../rpg/classes/human.js';
import { playFile } from '../sound/playFile.js';
import { Boss } from '../rpg/classes/boss.js';
import { getData } from '../data/getData.js';
import { v4 } from 'uuid';

export default {
    name: 'raid',
    description: 'Squad up versus a random raid boss',
    category: 'rpg',
    options: [{
        type: 5, //BOOLEAN
        name: 'mute',
        description: 'Do not play boss themes',
        required: false
    }],
    async execute(client, db, interaction) {
        //limit one raid at a time
        if (client.raiding) {
            return interaction.reply({ content: 'Only one raid at a time!', ephemeral: true });
        }

        //change raid status to active
        client.raiding = true;

        //determine voice channel for boss theme
        const voiceChannel = interaction.options.getBoolean('mute') ? null : interaction.member.voice.channel;

        //find members for raid
        let party = await gatherParty(client, interaction);

        //get fighter data
        const partyData = await getData(db, party.map(user => user.id), true);

        //filter out inactive players
        party = party.filter(user => partyData.map(data => data.UserID).includes(user.id));

        //host determines if they should start with registered party
        if (await confirmParty(client, interaction, party)) {
            //set up fighters and boss
            const fighterParty = await setup(client, db, interaction, party, partyData, voiceChannel);

            //begin fight
            const message = await interaction.followUp('<reserved>');
            const actions = await fight(client, fighterParty, message);

            //resolve fight
            getResults(client, db, message, fighterParty, actions);
        }
        else {
            //exit if host cancels
            interaction.editReply({ content: '**Party leader canceled**', components: [] });
        }

        //change raid status to inactive
        client.raiding = false;
    }
};

async function gatherParty(client, interaction) {
    //send invite message
    const raidMessage =  `Join ${interaction.member.displayName} on a raid!`;
    const buttons = [new MessageActionRow()
        .addComponents([
            new MessageButton()
                .setEmoji(client.ids.emojis.yeehaw)
                .setLabel('Join')
                .setStyle('PRIMARY')
                .setCustomId('join'),
            new MessageButton()
                .setEmoji(client.ids.emojis.sanic)
                .setLabel('Start')
                .setStyle('SUCCESS')
                .setCustomId('start')
        ])];
    interaction.reply({ content: raidMessage, components: buttons });

    //save message id for later
    interaction.messageID = (await interaction.fetchReply()).id;

    //set up button collector
    const filter = buttonInteraction => buttonInteraction.message.id === interaction.messageID;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 300000 });

    //use set to ignore duplicates
    const party = new Set();
    party.add(interaction.user);

    //when a button is pressed...
    collector.on('collect', async buttonInteraction => {
        //add player to party and display
        if (buttonInteraction.customId === 'join') {
            party.add(buttonInteraction.user);
            const partyMessage = `\n**Party:** ${[...party].join(', ')}`;
            buttonInteraction.update({ content: raidMessage + partyMessage });
        }
        //host starts before timeout
        else if (buttonInteraction.user === interaction.user) {
            buttonInteraction.deferUpdate();
            collector.stop();
        }
    });

    //return array of users
    return new Promise(function(resolve) {
        collector.on('end', () => resolve(Array.from(party)));
    });
}

async function confirmParty(client, interaction, party) {
    //send host-confirm message
    const content =  `**Party:** ${[...party].join(', ')}\nBegin raid?`;
    const buttons = [new MessageActionRow()
        .addComponents([
            new MessageButton()
                .setEmoji(client.ids.emojis.baba)
                .setLabel('Cancel')
                .setStyle('DANGER')
                .setCustomId('cancel'),
            new MessageButton()
                .setEmoji(client.ids.emojis.yeehaw)
                .setLabel('Start')
                .setStyle('SUCCESS')
                .setCustomId('start')
        ])];
    interaction.editReply({ content: content, components: buttons });

    //set up button collector
    const filter = buttonInteraction => 
        buttonInteraction.message.id === interaction.messageID && 
        buttonInteraction.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 300000, max: 1 });

    //on collect, note if it is start button
    let start;
    collector.on('collect', async buttonInteraction => start = buttonInteraction.customId === 'start');

    //return boolean
    return new Promise(function(resolve) {
        collector.on('end', () => resolve(start));
    });
}
      
async function setup(client, db, interaction, party, partyData, voiceChannel) {
    let fighterParty = [];

    //setup each member
    party.forEach(user => {
        const member = interaction.guild.members.resolve(user);
        const fighter = new Human(member, partyData.find(d => d.UserID === user.id));
        fighter.turn = getChance(50);
        fighterParty.push(fighter);
    });

    //average of all party members, re-averaged with highest level to add weight: this made things too easy with high skill lvls
    const lvl = Math.round(((partyData.map(d => d.Lvl).reduce((a, b) => a + b) / partyData.length) + Math.max(...partyData.map(d => d.Lvl))) / 2);
    const boss = new Boss(interaction.guild.members.resolve(client.user), lvl, party.length);

    //assign opponents and add boss to party
    fighterParty.forEach(fighter => fighter.opponents = [boss]);
    boss.opponents = Array.from(fighterParty);
    fighterParty.push(boss);

    //announce boss
    await interaction.editReply({ content: boss.entrance, components: [] });
    if (voiceChannel) {
        playFile(client, voiceChannel, `./bosses/${boss.name}.mp3`);
    }

    return fighterParty;
}
            
function getResults(client, db, message, party, actions) {
    //separate party from boss
    const boss = party.find(fighter => fighter.boss);
    const humans = party.filter(fighter => fighter.human);

    //determine victor
    if (humans.every(h => h.hp <= 0)) {
        actions.push('The party wiped!');

        //tie
        if (boss.hp <= 0) {
            actions.push("**It's a tie...**");
        }
        //loss
        else {
            //greeter-bot gains experience
            const xp = Math.round(humans.map(h => h.bonus).reduce((a, b) => a + b) * 150);
            updateData(db, boss.member.user, { xp: xp });
        }
    }
    //win
    else {
        //add boss death message
        actions.push(boss.getExit());

        //share xp
        const xp = Math.round(Math.log(party.length) * 10000 / humans.length);
        humans.forEach(h => updateData(db, h.member.user, { xp: xp }));
        actions.push(`Each player gains ${xp} XP!`);

        //have players roll for loot
        getLoot(client, db, humans, message.channel, { chances: /*[0, 30, 20, 10, 1]*/[0, 0, 2, 2, 1] , pick: boss.type === 3 });
    }

    //display final messages
    display(client, message, actions, party, actions.length - 1, null, []);
}

async function getLoot(client, db, humans, channel, options) {
    //set up variables
    const lootIcons = ['⬜', '🔷', '💜', '⭐', '💯'];  
    const needers = new Set();
    const passers = new Set();
    let item, text, lootIcon;

    //guarantee pick of destiny
    if (options.pick && getChance(25)) {
        item = { type: 'pick', id: v4() };
        text = 'the Pick of Destiny';
        lootIcon = '🥒';
    }
    //randomize a weapon
    else {
        item = generateWeapon(humans[0], options);
        text = `a${item.rarity === 2 ? 'n' : ''} ${item.getRarity()} ${item.name}`;
        lootIcon = lootIcons[item.rarity];
    }

    //skip the roll if there is only one contestant
    if (humans.length === 1) {
        channel.send(`${lootIcon} You found ${text}! ${lootIcon} `);
        return addToInventory(client, db, humans[0].member.user, item);
    }

    //get decision buttons
    const buttons = [new MessageActionRow()
        .addComponents([
            new MessageButton()
                .setLabel('Pass.')
                .setStyle('SECONDARY')
                .setCustomId('pass'),
            new MessageButton()
                .setLabel('Need!')
                .setStyle('PRIMARY')
                .setCustomId('need')
        ])];

    //send new message in chat. This helps if there have been messages since the raid ended
    text += ' dropped! Roll for it!';
    const message = await channel.send({ content: `${lootIcon} ${text} ${lootIcon} `, components: buttons });

    //only allow raiders to respond
    const filter = buttonInteraction => humans.map(h => h.member.user).includes(buttonInteraction.user) && buttonInteraction.message.id === message.id;
    const collector = message.createMessageComponentCollector(filter, { time: 60000 });
    
    //when a button is pressed...
    collector.on('collect', buttonInteraction => {
        //defer for no update
        buttonInteraction.deferUpdate();

        //user passes on item
        if (buttonInteraction.customId === 'pass') {
            passers.add(buttonInteraction.user);
            needers.delete(buttonInteraction.user);
        }
        //user needs item
        else {
            needers.add(buttonInteraction.user);
            passers.delete(buttonInteraction.user);
        }

        //stop if all users have decided
        if ((new Set([...needers, ...passers])).size === humans.length) {
            collector.stop();
        }
    });

    collector.on('end', () => {
        //prioritize: needs, passes, default (all)
        let arr =
            needers.size ? needers :
            passers.size ? passers : humans.map(h => h.member.user);

        //pick one winner
        const winner = selectRandom(Array.from(arr));

        //regenerate the weapon to match level
        if (item.weapon) {
            const options = { type: item.type, chances: [0, 0, 0, 0, 0] };
            options.chances[item.rarity] = 1;
            item = generateWeapon(humans.find(human => human.member.id === winner.id) || 1, options);
        }

        addToInventory(client, db, winner, item);
        channel.send(`${winner.username} wins!`);
    });
}
