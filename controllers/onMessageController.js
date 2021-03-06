const { playSong, getData, updateData, getRandom, react } = require('../utils.js');

module.exports.execute = async function(client, config, db, message) {
    //Bots don't talk to bots nor links
    if (message.author.bot || message.content.toUpperCase().startsWith('HTTP')) {
        return;
    }
    //Banana crown for the elite
    else if (/.*:BananaCrown:.*/.test(message.content)) {
        getData(db, message.author.id)
        .then(data => {
            if (!data.Responses || !data.Responses.GBPs || !data.Responses.GBPs.length || data.Responses.GBPs[0].GBPs < 1000) {
                return message.delete().catch(console.error);
            }
        });
    }

    //xp for participation in chat
    updateData(db, message.author, { xp: 5 });

    //Stop spammers in their tracks
    if (!message.guild || !message.author.dorseProtection && message.guild.id === config.ids.hooliganHouse) {
        message.channel.messages.fetch({ limit: 10 })
        .then(messages => {
            const filteredMessages = messages.array().filter(msg => msg.author.id === message.author.id);
            if (filteredMessages.length > 1 &&
                filteredMessages[0].content === filteredMessages[1].content &&
                !filteredMessages[0].attachments.size &&
                !filteredMessages[1].attachments.size) {
                    message.reply('dorse');
                    updateData(db, message.author, { gbps: -2 });
            }
        })
        .catch(console.error);
    }

    //Commands
    if (message.content.startsWith(config.prefix)) {
        const commandName = message.content.slice(config.prefix.length).split(/\s+/)[0].toLowerCase();
        const args = message.content.slice(config.prefix.length + commandName.length).trim();
        const command = client.commands.get(commandName) ||
            client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

        if (!command) {
            return react(message, config.ids.brownie);
        }

        if (['gbp', 'rpg'].includes(command.category) && 
            [config.ids.mainChat, config.ids.botchat].includes(message.channel.id))
        {
                return;
        }

        if (command.args && !args.length) {
            return message.reply(`Please use: \`${config.prefix}${command.name} ${command.usage}\``);
        }

        try {
            return command.execute(client, config, db, message, args);
        }
        catch (error) {
            console.error(error);
            return message.reply('There was an error trying to execute the command.');
        }
    }

    //Hello Troll on Q
    else if (message.content.toLowerCase().indexOf('hello') !== -1) {
        message.reply("Hey it's me, Q! JK it's Bwandy hehe");
    }

    //Sweet dreams!
    else if (/.*:gr?oose:.*:k?night:.*/.test(message.content)) {
        playSong(client, message.member.voice.channel, 'goosenight.wav');
    }

    //Sweet memes!
    else if (/.*:gr?oose:.*:day:.*/.test(message.content)) {
        playSong(client, message.member.voice.channel, 'Goose day.mp3');
    }

    //What the HECK!!!!
    else if (isNotChristian(client, message)) {
        const date = new Date();
        let filterText = 'Friendly reminder that this is a **Christian** chatroom! ';
        if (date.getDay() === 0) {
            filterText += "Please respect the Lord's day of rest. ";
        }
        message.reply(filterText + message.guild.emojis.cache.random(1).toString());
        updateData(db, message.author, { gbps: -1 });
    }

    //The never-ending debate
    else if (message.content.toLowerCase() === 'all women are queens') {
        playSong(client, message.member.voice.channel, 'Queens.mp3');
    }

    //Enforce some positivity
    else if (isQuestion(message.content)) {
        playSong(client, message.member.voice.channel, 'Doable.mp3');
        react(message, config.ids.doable);
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
    else if (!getRandom(49)) {
        if (!getRandom(6) && message.member.voice.channel) {
            playSong(client, message.member.voice.channel, 'Ree.mp3');
            react(message, config.ids.ree);
        }
        else {   
            message.channel.send(spongeMock(message.content));
        }
    }
};

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

function isNotChristian(client, message) {
    for(var i = 0; i < client.swears.length; i++) {
        if (message.content.toLowerCase().indexOf(client.swears[i]) !== -1) {
            return true;
        }
    }
    
    return false;
}