const Discord = require('discord.js');
const client = new Discord.Client();
var isReady = true;

client.on('ready', () => {
    isReady = true;
    console.log('I am ready!');
});

client.on('message', message => {
    if (message.author.bot) {
        return;
    }
    /*else if (message.content === message.channel.around.find(x => x.content === message.content)) {
        message.reply("dorse");
    }*/
    else if (isReady && message.content === "!exposed")
    {
        isReady = false;
        var voiceChannel = message.member.voiceChannel;
        voiceChannel.join().then(connection => {
            const dispatcher = connection.playFile('./Exposed.mp3');
            dispatcher.on("end", end => {
                isReady = true;
            });
            voiceChannel.leave();
        }).catch(error => console.log(error));
    }
    else if (message.content === "ting") {
        message.channel.send("SKKKKRRRA");
        message.channel.send("POP POP KOT KOT KOT");
        message.channel.send("SKIBIKI POP POP... AND A PU PU PUDRRR BOOM");
        message.channel.send("SKYA, DU DU KU KU DUN DUN");
        message.channel.send("*POOM* *POOM*");
    }
    else if (message.content.endsWith('ing') && message.content.match(/^[A-Za-z]+$/)) {
        newMessage = message.content.substr(0, message.content.length - 3) + 'o' + message.content.substr(message.content.length - 2, message.content.length + 1);
        message.reply(newMessage);
    }
    else if (Math.floor(Math.random() * 20) === 0) {
        //random chance to get mocked
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