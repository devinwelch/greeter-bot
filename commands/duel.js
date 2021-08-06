const { getData, updateData, getRandom, react, playSong } = require('../utils.js');
const { fight, display } = require('../rpg/fight');
const { Human } = require('../rpg/classes/human');

module.exports = {
    name: 'duel',
    description: 'Duel against another player using equipped weapons. Add a wager to bet GBPs! Spectators can place side bets before the duel starts.',
    category: 'rpg',
    usage: '[wager] <@user>',
    execute(client, config, db, message, args) {
        if (!message.mentions.members.size) {
            return message.reply('Please @ a user!');
        }

        const wager = /\d+ .+/.test(args) ? Math.max(Math.floor(args.trim().split(' ', 1)[0]), 0) : 0;
        const challenger = message.member;
        const target = message.mentions.members.first();

        //challenger thinks he's funny
        if (target.user === client.user) {
            return client.commands.get('raid').execute(client, config, db, message, args);
        }
        else if (target === challenger) {
            return message.reply('Quit playing with yourself!');
        }

        checkData(client, config, db, message, challenger, target, wager);
    }
};

async function checkData(client, config, db, message, challenger, target, wager) {
    //get challenger and target data
    const data = await getData(db, [challenger.id, target.id]);
    if (!data.Responses || !data.Responses.GBPs || data.Responses.GBPs.length !== 2) {
        return message.reply('Something went wrong.');
    }
    const challengerData = data.Responses.GBPs.find(d => d.UserID === challenger.id);
    const targetData = data.Responses.GBPs.find(d => d.UserID === target.id);

    //challenger or target not found
    if (!challengerData) {
        return message.reply('Cannot find challenger data');
    }
    if (!targetData) {
        return message.reply('Cannot find target data');
    }

    //challenger or target cannot match wager
    if (wager) {
        if (challengerData.GBPs < wager) {
            return message.reply(`Hang on there, slick! You only have ${challengerData.GBPs} GBPs!`);
        }
        if (targetData.GBPs < wager) {
            return message.reply(`${target.displayName} can't match that bet!`);
        }
    }

    invite(client, config, db, message.channel, challenger, target, challengerData, targetData, wager);
}

async function invite(client, config, db, channel, challenger, target, challengerData, targetData, wager) {
    const invite = [];

    invite.push(`${target.displayName}! ${challenger.displayName} challenges you to a duel for ${wager ? `**${wager} GBPs**` : 'fun'}!`);
    invite.push('React here:');
    invite.push(`${client.emojis.cache.get(config.ids.yeehaw)}- accept duel`);
    invite.push(`${client.emojis.cache.get(config.ids.baba  )}- decline/cancel`);

    const msg = await channel.send(invite);
    react(msg, [config.ids.yeehaw, config.ids.baba]);

    //await reactions for up to 60 sec
    const filter = (reaction, user) => 
        (reaction.emoji.id === config.ids.baba && 
            (user.id === challenger.id || user.id === target.id)) ||
        (reaction.emoji.id === config.ids.yeehaw && user.id === target.id);
    const collector = msg.createReactionCollector(filter, { time: 60000, max: 1 });

    collector.on('collect', reaction => {
        //accept
        if (reaction.emoji.id === config.ids.yeehaw) {
            setup(client, db, channel, challenger, target, challengerData, targetData, wager);
        }
        //cancel
        else if (reaction.emoji.id === config.ids.baba) {
            collector.stop();
        }
    });

    //delete invite after accepted/rejected
    collector.on('end', function() {
        msg.delete().catch(console.error); 
    });
}

async function setup(client, db, channel, challenger, target, challengerData, targetData, wager) {
    //chance to play duel theme if both members in voice
    const voiceChannel = challenger.voice.channel;
    if (voiceChannel && voiceChannel === target.voice.channel && !getRandom(4)) {
        playSong(client, voiceChannel, 'duel.mp3');
    }

    //convert to fighter
    challenger = new Human(challenger, challengerData, db);
    target = new Human(target, targetData, db);

    //buff sequence weapons if opponent is infected
    challenger.turn = target.infected ? getRandom(1) : 0;
    target.turn = challenger.infected ? getRandom(1) : 0;

    //set opponent
    challenger.opponents = [target];
    target.opponents = [challenger];

    const party = [challenger, target];
    const message = await channel.send('<reserved>');

    let actions = [`${target.name} accepted ${challenger.name}'s challenge! ${wager || 'No'} GBPs are on the line.`];
    actions = await fight(client, party, message, actions);

    getResults(client, db, message, party, actions, wager);
}

function getResults(client, db, message, party, actions, wager) {
    const winner = party.find(fighter => fighter.hp > 0);
    const loser = party.find(fighter => fighter !== winner);

    //award GBPs
    if (winner) {
        const xp = Math.round(200 * loser.bonus);
        updateData(db, winner.member.user, { gbps: wager, xp: xp });
        updateData(db, loser.member.user, { gbps: -wager });

        actions.push(`${winner.name} wins ${wager ? `${wager} GBPs and `: ''}${xp} XP!`);
    }
    //tie
    else {
        actions.push(`**It's a tie...${wager ? ' No GBPs are awarded.' : ''}**`);
    }

    display(client, message, actions, party, actions.length - 1);
    message.reactions.removeAll();
}