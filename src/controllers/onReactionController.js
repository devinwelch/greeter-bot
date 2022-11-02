import { getChance } from '../utils/random.js';
import { playFile } from '../sound/playFile.js';
import { updateData } from '../data/updateData.js';

export async function onReaction(client, db, reaction, user) {
    if (reaction.emoji.id === client.ids.emojis.nanners &&
        reaction.message.author.id !== user.id) {
        giveNanners(db, reaction, user);
    }
    
    else if (reaction.emoji.id === client.ids.emojis.brownie && getChance(2)) {
        const voiceChannel = reaction.message.member.voice.channel;
        if (voiceChannel) {
            playFile(client, voiceChannel, 'alert.mp3');
        }
    }
}

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