const { updateGBPs } = require('../utils.js');

let self = module.exports = {
    execute(client, config, db, reaction, user) {
        console.log(`${user.username} reacted with '${reaction.emoji.name}':${reaction.emoji.id}`);

        if (reaction.message.member.id === client.user.id) {
            //emoji game
            if (reaction.message.content.startsWith('**Guess the emoji**')) {
                const newEmoji = reaction.message.guild.emojis.cache.random(1)[0];

                if (newEmoji.id === reaction.emoji.id) {
                    const award = 5;
                    reaction.message.edit(`**${user.username}** wins ${award} GBPs! ${newEmoji.toString()}`); 
                    updateGBPs(db, user, award);
                }
                else {
                    reaction.message.reactions.removeAll();
                    reaction.message.edit(`**Guess the emoji** again (using reactions): ${newEmoji}`);
                }
            }
        }
        
        else if (reaction.emoji.id === config.ids.nanners &&
            reaction.message.author.id !== user.id) {
            self.giveNanners(db, reaction.message.id, user.id, reaction.message.author, 1);
        }
        
        else if (reaction.emoji.id === config.ids.brownie && Math.floor(Math.random() * 50) === 0) {
            const voiceChannel = reaction.message.member.voice.channel;
            if (voiceChannel) {
                client.utils.playSong(client, voiceChannel, 'Alert.mp3');
            }
        }
    },

    giveNanners(db, messageID, reactorID, user, amount) {
        const params = {
            TableName: 'Reactions',
            Item: {
                'MessageID': messageID,
                'ReactorID': reactorID
            },
            Key: {
                'MessageID': messageID,
                'ReactorID': reactorID
            }
        };
        
        //check if user already gave nanners
        db.get(params, function(err, data) {
            if (err) {
                console.error('Unable to query message. Error:', JSON.stringify(err, null, 2));
            } else if (!data.Item) {
                //user has not already given nanners
                db.put(params, function(err) {
                    if (err) {
                        console.error('Unable to give nanners. Error:', JSON.stringify(err, null, 2));
                    } else {
                        console.log(`Nanners given to ${user.username}`);
                        updateGBPs(db, user, amount);
                    }
                });
            } else  {
                console.log('User already gave nanners:', JSON.stringify(data, null, 2));
            }
        });
    }
};