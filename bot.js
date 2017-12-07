const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
    console.log('I am ready!');
});

client.on('message', message => {
    if (message.author.bot) {
        return;
    }
    else if (message.content === "ting") {
        message.channel.post("SKKKKRRRA");
        message.channel.post("POP POP KOT KOT KOT");
        message.channel.post("SKIBIKI POP POP... AND A PU PU PUDRRR BOOM");
        message.channel.post("SKYA, DU DU KU KU DUN DUN");
        message.channel.post("*POOM* *POOM*");
    }
    else if (message.content.endsWith('ing') && message.content.match(/^[A-Za-z]+$/)) {
        newMessage = message.content.substr(0, message.content.length - 3) + 'o' + message.content.substr(message.content.length - 2, message.content.length + 1);
        message.reply(newMessage);
    }
});

client.login(process.env.BOT_TOKEN);