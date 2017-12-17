const Discord = require('discord.js');
const client = new Discord.Client();

const { Client } = require('pg');
const sql = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true
});
sql.connect();
sql.query('SELECT table_schema,table_name FROM information_schema.tables;', (err, res) => {
    if (err) throw err;
    for (let row of res.rows) {
      console.log(JSON.stringify(row));
    }
    sql.end();
});

client.on('ready', () => {
    console.log('I am ready!');
});

client.on('message', message => {
    //Bots don't talk to bots
    if (message.author.bot) {
        return;
    }

    /* channel.fetchMessages({limit: 10})
    .then(messages => console.log(`Received ${messages.size} messages`))
    .catch(console.error); */

    //Stop spammers in their tracks
    messages = message.channel.fetchMessages({limit: 100});
    for(i = messages.length - 1; i >= 0; i--) {
        if (messages[i].author === message.author) {
            console.log(`Author: ${messages[i].author}`);
            if (messages[i].content === message.content) {
                console.log(`Previous: ${message.id}, Comparing:${messages[i].id}`);
                message.reply("dorse");
            }
            break;
        }
    }
    console.log(`we looked at ${messages.length} messages`);

    //!Bot commands
    if (message.content[0] === '!') {
        cmd = message.content.split(/[\s!]+/)[1].toLowerCase();
        params = message.content.substring(cmd.length + 1, message.content.length).trim();
        switch(cmd) {
            //Play a beautiful serenade
            case "exposed":
                var voiceChannel = message.member.voiceChannel;
                voiceChannel.join().then(connection => {
                    const dispatcher = connection.playFile('./Exposed.mp3');
                    dispatcher.on("end", end => {
                        voiceChannel.leave();
                    });
                }).catch(error => console.log(error));
                break;
            //Nominate an AOTY
            case "nominate":
                album = params.split(" - ")[0];
                artist = params.split(" - ")[1];
                console.log("stuff:" + album, artist, message.author.id); //test
                sql.query(`SELECT * FROM database`).then(row => {
                    sql.query(`INSERT INTO albums (album, artist, userID) VALUES ($1, $2, $3)`, [album, artist, message.author.id]);
                    console.log(message.author.id + " added " + params);
                }).catch(() => {
                    console.error;
                });
                break;
            default:
                break;
        }
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