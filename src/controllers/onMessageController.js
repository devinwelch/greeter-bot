import { getData } from '../data/getData.js';
import { updateData } from '../data/updateData.js';
import { playFile } from '../sound/playFile.js';
import { react } from '../utils/react.js';
import { getChance } from '../utils/random.js';
import { getNetWorth } from '../gbp/getNetWorth.js';

export async function onMessage(client, db, message) {
    //Bots don't talk to bots nor links
    if (message.author.bot || message.content.toUpperCase().startsWith('HTTP')) {
        return;
    }

    //Banana crown for the elite
    else if (/.*:BananaCrown:.*/.test(message.content)) {
        const data = await getData(db, message.author.id);
        if (!data || (await getNetWorth(db, data)) < 1000) {
            return message.delete().catch(console.error);
        }
    }
    
    if (!client.application?.owner) await client.application?.fetch();
    if (message.content.toLowerCase() === '!deploy' && message.author.id === client.application?.owner.id) {
		const cmd = client.commands.get('deploy');

		const command = await client.guilds.cache.get(message.guildId)?.commands.create(cmd);
		console.log(command);
	}

    //xp for participation in chat
    updateData(db, message.author, { xp: 5 });

    //Stop spammers in their tracks
    if (!message.guild || !message.author.dorseProtection && message.guild.id === client.ids.guilds.hooliganHouse) {
        message.channel.messages.fetch({ limit: 10 })
        .then(messages => {
            const filteredMessages = Array.from(messages.filter(msg => msg.author.id === message.author.id).values());
            if (filteredMessages.length > 1 &&
                filteredMessages[0].content === filteredMessages[1].content &&
                !filteredMessages[0].attachments?.size &&
                !filteredMessages[1].attachments?.size) {
                    message.reply('dorse');
                    updateData(db, message.author, { gbps: -1 });
            }
        })
        .catch(console.error);
    }

    //Hello Troll on Q
    if (message.content.toLowerCase().indexOf('hello') !== -1) {
        message.reply("Hey it's me, Q! JK it's Bwandy hehe");
    }

    //Sweet dreams!
    else if (/.*:gr?oose:.*:k?night:.*/.test(message.content)) {
        playFile(client, message.member.voice.channel, 'other/goosenight.wav');
    }

    //Sweet memes!
    else if (/.*:gr?oose:.*:day:.*/.test(message.content)) {
        playFile(client, message.member.voice.channel, 'other/gooseday.mp3');
    }

    //The never-ending debate
    else if (message.content.toLowerCase() === 'all women are queens') {
        playFile(client, message.member.voice.channel, 'other/queens.mp3');
    }

    //Enforce some positivity
    else if (isQuestion(message.content)) {
        playFile(client, message.member.voice.channel, 'other/doable.mp3');
        react(message, client.ids.emojis.doable);
    }

    //Man's not hot
    else if (message.content === 'ting') {
        message.channel.send('SKKKKRRRA');
        message.channel.send('POP POP KOT KOT KOT');
        message.channel.send('SKIBIKI POP POP... AND A PU PU PUDRRR BOOM');
        message.channel.send('SKYA, DU DU KU KU DUN DUN');
        message.channel.send('*POOM* *POOM*');
    }

    //Ping pong ding dong!
    else if (message.content.endsWith('ing') && message.content.match(/^[A-Za-z]+$/)) {
        message.reply(message.content.substr(0, message.content.length - 3) + 'o' + message.content.substr(message.content.length - 2, message.content.length + 1));
    }

    //Random chance to make fun of you or scream at you
    else if (getChance(1)) {
        if (getChance(33) && message.member.voice.channel) {
            playFile(client, message.member.voice.channel, 'ree.mp3');
            react(message, client.ids.emoji.ree);
        }
        else {   
            message.channel.send(spongeMock(message.content));
        }
    }
}

function isQuestion(message) {
    return (message.toLowerCase().startsWith('can') || 
        message.toLowerCase().startsWith('will')) &&
        message.endsWith('?');
}

function spongeMock(messageText) {
    let toggle = true;
    let mock = '';
    for(var i = 0; i < messageText.length; i++) {
        mock += toggle ? messageText[i].toUpperCase() : messageText[i].toLowerCase();
        if (messageText[i].match(/[a-z]/i)) {
            toggle = !toggle;
        }
    }
    return mock;
}