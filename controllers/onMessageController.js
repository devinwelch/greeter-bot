const { playSong, updateGBPs } = require('../utils.js');

let self = module.exports = {
    execute(client, config, db, message) {
        //Bots don't talk to bots nor links
        if (message.author.bot || message.content.toUpperCase().startsWith('HTTP')) {
            return;
        }
        //Banana crown for the elite
        else if (/.*:BananaCrown:.*/.test(message.content)) {
            const params = {
                TableName: 'GBPs',
                Key: { 'UserID': message.author.id }
            };
            db.get(params, function(err, data) {
                if (err) { 
                    console.log('heavy lies the crown');
                }
                else if (data.Item.GBPs < 1000) {
                    return message.delete().catch(console.error);
                }
            });
        }

        //Stop spammers in their tracks
        message.channel.messages.fetch({limit: 4})
            .then(messages => {
                const filteredMessages = messages.array().filter(msg => msg.author.id === message.author.id);
                if (filteredMessages.length > 1 &&
                    filteredMessages[0].content === filteredMessages[1].content &&
                    !filteredMessages[0].attachments.size &&
                    !filteredMessages[1].attachments.size) {
                        message.reply('dorse');
                        updateGBPs(db, message.author, -2);
                }
            })
            .catch(console.error);

        //Commands
        if (message.content.startsWith(config.prefix)) {
            const commandName = message.content.slice(config.prefix.length).split(/\s+/)[0].toLowerCase();
            const args = message.content.slice(config.prefix.length + commandName.length).trim();
            const command = client.commands.get(commandName) ||
                client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

            if (!command) {
                message.guild.members.fetch({ query: commandName, limit: 1})
                    .then(member => {
                        if (member) {
                            message.react(config.ids.brownie)
                                .catch(console.error);
                        }
                    })
                    .catch(console.error);

                return;
            }

            if (command.args && !args.length) {
                return message.reply(`Please use: \`${config.prefix}${command.name} ${command.usage}\``);
            }

            try {
                command.execute(client, config, db, message, args);
            }
            catch (error) {
                console.error(error);
                message.reply('There was an error trying to execute the command.');
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
        else if (self.isNotChristian(client, message)) {
            const date = new Date();
            let filterText = 'Friendly reminder that this is a **Christian** chatroom! ';
            if (date.getDay() === 0) {
                filterText += "Please respect the Lord's day of rest. ";
            }
            message.reply(filterText + message.guild.emojis.cache.random(1).toString());
            updateGBPs(db, message.author, -1);
        }

        //The never-ending debate
        else if (message.content.toLowerCase() === 'all women are queens') {
            playSong(client, message.member.voice.channel, 'Queens.mp3');
        }

        //Enforce some positivity
        else if (self.isQuestion(message.content)) {
            playSong(client, message.member.voice.channel, 'Doable.mp3');
            message.react(config.ids.doable);
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
        else if (Math.floor(Math.random() * 20) === 0) {
            if (Math.floor(Math.random() * 4) === 0 && message.member.voice.channel) {
                playSong(client, message.member.voice.channel, 'Ree.mp3');
                message.react(config.ids.ree).catch(console.error);
            }
            else {   
                message.channel.send(self.spongeMock(message.content));
            }
        }
    },

    isQuestion(message) {
        return (message.toLowerCase().startsWith('can') || 
            message.toLowerCase().startsWith('will')) &&
            message.endsWith('?');
    },

    spongeMock(messageText) {
        let toggle = true;
        let mock = '';
        for(var i = 0; i < messageText.length; i++) {
            mock += toggle ? messageText[i].toUpperCase() : messageText[i].toLowerCase();
            if (messageText[i].match(/[a-z]/i)) {
                toggle = !toggle;
            }
        }
        return mock;
    },

    isNotChristian(client, message) {
        for(var i = 0; i < client.swears.length; i++) {
            if (message.content.toLowerCase().indexOf(client.swears[i]) !== -1) {
                return true;
            }
        }
        
        return false;
    }
};