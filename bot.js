const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
    console.log('I am ready!');
});

client.on('message', message => {
    //test
    message.channel.fetchMessages().find((x) => { return x.author === message.author })
    .then(messages => console.log(`Received ${messages.size} messages`))
    .catch(console.error);

    if (message.author.bot) {
        return;
    }

    //Stop spammers in their tracks
    /*else if (message.content === message.channel.fetchMessages().find((x) => { return x.author === message.author })[message.channel.fetchMessages().length - 2]) {
        message.reply("dorse");
    }*/

    //Play the best song ever
    else if (message.content === "!exposed") {
        var voiceChannel = message.member.voiceChannel;
        voiceChannel.join().then(connection => {
            const dispatcher = connection.playFile('./Exposed.mp3');
            dispatcher.on("end", end => {
                voiceChannel.leave();
            });
        }).catch(error => console.log(error));
    }

    //Enforce some positivity
    else if (isQuestion(message.content)) {
        message.member.voiceChannel.join().then(connection => {
            const dispatcher = connection.playFile('./Doable.mp3');
            dispatcher.on("end", end => {
                message.member.voiceChannel.leave();
            });
        }).catch(error => console.log(error));
        message.react(message.channel.client.emojis.find(isDoable));
    }

    //Man's not hot
    else if (message.content === "ting") {
        message.channel.send("SKKKKRRRA");
        message.channel.send("POP POP KOT KOT KOT");
        message.channel.send("SKIBIKI POP POP... AND A PU PU PUDRRR BOOM");
        message.channel.send("SKYA, DU DU KU KU DUN DUN");
        message.channel.send("*POOM* *POOM*");
    }

    //Ping pong ding dong!
    else if (message.content.endsWith('ing') && message.content.match(/^[A-Za-z]+$/)) {
        newMessage = message.content.substr(0, message.content.length - 3) + 'o' + message.content.substr(message.content.length - 2, message.content.length + 1);
        message.reply(newMessage);
    }

    //Random chance to make fun of you
    else if (Math.floor(Math.random() * 20) === 0) {
        toggle = true;
        mock = "";
        for(i = 0; i < message.content.length; i++) {
            mock += toggle ? message.content[i].toUpperCase() : message.content[i].toLowerCase();
            if (message.content[i].match(/[a-z]/i)) {
                toggle = !toggle;
            }
        }
        message.channel.send(mock);
    }

});

client.login(process.env.BOT_TOKEN);

function isQuestion(message) {
    return (message.toLowerCase().startsWith("can") || 
        message.toLowerCase().startsWith("could") || 
        message.toLowerCase().startsWith("would") || 
        message.toLowerCase().startsWith("will")) &&
        message.endsWith('?');
};

function isDoable(emoji) {
    return emoji.name === "thatsdoable" ;
};