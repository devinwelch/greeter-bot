const { updateData, getRandom, playSong } = require('../utils.js');

module.exports.execute = async function(client, config, db, reaction, user) {
    await client.users.fetch(user.id);
    await client.guilds.cache.get(reaction.message.guild.id).members.fetch(user.id);
    
    if (false && reaction.message.member.id === client.user.id) { //BUG
        //emoji game
        //I should re-do this game with a Collector
        if (reaction.message.content.startsWith('**Guess the emoji**')) {
            const newEmoji = reaction.message.guild.emojis.cache.random(1)[0];

            if (newEmoji.id === reaction.emoji.id) {
                const award = 10;
                const xp = 250;
                reaction.message.edit(`**${user.username}** wins ${award} GBPs and ${xp} xp! ${newEmoji.toString()}`); 
                updateData(db, user, { gbps: award, xp: xp });
            }
            else {
                reaction.message.reactions.removeAll();
                reaction.message.edit(`**Guess the emoji** again (using reactions): ${newEmoji}`);
            }
        }
    }
    
    else if (reaction.emoji.id === config.ids.nanners &&
        reaction.message.author.id !== user.id) {
        giveNanners(db, reaction, user);
    }
    
    else if (reaction.emoji.id === config.ids.brownie && !getRandom(49)) {
        const voiceChannel = reaction.message.member.voice.channel;
        if (voiceChannel) {
            playSong(client, voiceChannel, 'Alert.mp3');
        }
    }
};

function giveNanners(db, reaction, user) {
    const params = {
        TableName: 'Reactions',
        Item: {
            'MessageID': reaction.message.id,
            'ReactorID': user.id
        },
        Key: {
            'MessageID': reaction.message.id,
            'ReactorID': user.id
        }
    };
    
    //check if user already gave nanners
    db.get(params, function(err, data) {
        if (err) {
            console.error('Unable to query message. Error:', JSON.stringify(err, null, 2));
        } 
        else if (!data.Item) {
            //user has not already given nanners
            db.put(params, function(err) {
                if (err) {
                    console.error('Unable to give nanners. Error:', JSON.stringify(err, null, 2));
                }
                else {
                    console.log(`${user.username} gave nanners to ${reaction.message.author.username}`);
                    updateData(db, reaction.message.author, { gbps: 1 });
                    updateData(db, user, { xp: 25 });
                }
            });
        }
    });
}