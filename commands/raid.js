const { playSong, updateData, assembleParty, getRandom, need } = require('../utils.js');
const { fight, display } = require('../rpg/fight');
const { Human } = require('../rpg/classes/human');
const { Boss } = require('../rpg/classes/boss');

module.exports = {
    name: 'raid',
    description: "Squad up versus a random raid boss! Roll need after a victory to claim a rare item! Use 'mute' to prevent boss music from playing.",
    category: 'rpg',
    usage: '[mute]',
    execute(client, config, db, message, args) {
        return message.reply('A recent Discord API change broke me and caused a huge bug, so this table is closed until further notice :(.'); //BUG

        //voice channel for boss music
        const voice = args.toLowerCase().includes('mute') ? false : message.member.voice.channel;

        //send invite
        const invite = [];
        invite.push(`Join ${message.member.displayName} on a raid!`);
        invite.push(`${client.emojis.resolve(config.ids.yeehaw)} to join the party`);
        invite.push(`${client.emojis.resolve(config.ids.sanic)} to get started`);
        
        assembleParty(client, config, db, message.channel, message.author, invite)
        .then(results => {
            if (results) {
                setup(client, db, message.guild, results.party, results.data.Responses.GBPs, message.channel, voice);
            }
        });
    }
};

async function setup(client, db, guild, party, data, channel, voice) {
    let fighterParty = [];

    //setup each member
    party.forEach(user => {
        const member = guild.members.resolve(user);
        const fighter = new Human(member, data.find(d => d.UserID === user.id));
        fighter.turn = getRandom(1);
        fighterParty.push(fighter);
    });

    //average of all party members, re-averaged with highest level to add weight: this made things too easy with high skill lvls
    const lvl = Math.round(((data.map(d => d.Lvl).reduce((a, b) => a + b) / data.length) + Math.max(...data.map(d => d.Lvl))) / 2);
    const boss = new Boss(guild.members.resolve(client.user), lvl, party.length);

    //assign opponents and add boss to party
    fighterParty.forEach(fighter => fighter.opponents = [boss]);
    boss.opponents = Array.from(fighterParty);
    fighterParty.push(boss);

    //get battle results then display
    await channel.send(boss.entrance);
    const message = await channel.send('<reserved>');

    //play boss theme
    if (voice) {
        playSong(client, voice, `./Bosses/${boss.name}.mp3`, true);
    }

    const actions = await fight(client, fighterParty, message);
    getResults(client, db, message, fighterParty, actions);
}
    
async function getResults(client, db, message, party, actions) {
    const boss = party.find(fighter => fighter.boss);
    const humans = party.filter(fighter => fighter.human);

    if (humans.every(h => h.hp <= 0)) {
        actions.push('The party wiped!');

        //tie
        if (boss.hp <= 0) {
            actions.push("**It's a tie...**");
        }
        //loss
        else {
            const xp = Math.round(humans.map(h => h.bonus).reduce((a, b) => a + b) * 150);
            updateData(db, boss.member.user, { xp: xp });
        }
    }
    //victory
    else {
        actions.push(boss.getExit());
        const xp = Math.round(Math.log(party.length) * 1000 / humans.length);
        humans.forEach(h => updateData(db, h.member.user, { xp: xp }));
        actions.push(`Each player gains ${xp} XP!`);
        need(client, db, party, message.channel, { chances: [0, 3, 2, 1], pick: boss.type === 3 });
    }

    display(client, message, actions, party, actions.length - 1);
    message.reactions.removeAll();
}