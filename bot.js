const Discord = require('discord.js');
const client = new Discord.Client();

/* var pg = require('pg');
const sql = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true
});
sql.query('SELECT table_schema,table_name FROM information_schema.tables;', (err, res) => {
    if (err) throw err;
    for (let row of res.rows) {
      console.log(JSON.stringify(row));
    }
    sql.end();
}); */

client.on('ready', () => {
    //sql.connect();
    console.log('I am ready!');
});

client.on('message', message => {
    //Bots don't talk to bots
    if (message.author.bot) {
        return;
    }

    //henlo fren
    /*if (message.isMemberMentioned(message.guild.members.find('user.username', 'greeter-bot'))) {
        message.reply("sup chromie homie?");
    }*/

    //Temporary punishment
    /*else if (message.createdTimestamp < 1522273178284 && message.author.username === "Wuju") {
        message.react(message.channel.client.emojis.find(isWuju));
    }*/

    //Stop spammers in their tracks
    message.channel.fetchMessages({limit: 100})
        .then(messages => checkForDorse(message, messages.findAll('author', message.author)))
        .catch(console.error);

    //!Bot commands
    if (message.content[0] === '!') {
        cmd = message.content.split(/[\s!]+/)[1].toLowerCase();
        params = message.content.substring(cmd.length + 1, message.content.length).trim();
        switch(cmd) {
            //Play a beautiful serenade
            case "exposed":
                playSong(message, './Exposed.mp3');
                break;
            //Nominate an AOTY
            case "nominate":
                if (/.+ - .+/.test(params)) {
                    album = params.split(/ - (.+)/)[0];
                    artist = params.split(/ - (.+)/)[1];
                    console.log(`User ${1} added ${2} - ${3}` [message.author.id, album, artist]);
                    sql.query(`INSERT INTO albums (album, artist, userID) VALUES ($1, $2, $3)`, [album, artist, message.author.id])
                    .catch(() => {
                        console.error;
                        message.reply("ERIC ERIC ERIC");
                    });
                }
                else {
                    message.reply("Invalid format, use **!help** for more information.");
                }
                break;
            //Create a poll with reactions
            case "poll":
                options = params.split(/ - /);
                message.channel.send("New poll!\n" + options[0] + "\n:red_circle: - " + options[1] + "\n:large_blue_circle: - " + options[2])
                .then(poll => pollReactions(poll))
                .catch(console.error);
                break;
            //For D&D nerds mostly
            case "roll":
                if (/d?\d+-?\d*/.test(params)) {
                    numbers = params.replace('d', '').split(/-/);
                    max = numbers.length === 2 ? Number(numbers[1]) : Number(numbers[0]);
                    min = numbers.length === 2 ? Number(numbers[0]) : 1;
                    roll = Math.floor(Math.random() * (max - min + 1)) + min;
                    message.channel.send(message.author.username + " rolled a **" + roll + "**");
                }
                else {
                    message.reply("Invalid format, use **!help** for more information.");
                }
                break;
            //Find out what greeter-bot can do
            case "help":
                switch(params.replace('!', '')) {
                    case null:
                    case "":
                        message.channel.send("Available commands: **!exposed**, **!nominate**, **!poll**, and **!roll**. Use:\n```!help [command name]``` to find out more about a specific command.");
                        break;
                    case "exposed":
                        message.channel.send("Play a beautiful serenade in the voice channel the user is currently in.");
                        break;
                    case "help":
                        helpResponse = spongeMock("My name is " + message.author.username + " and I think I'm soooo clever.");
                        message.channel.send(helpResponse);
                        break;
                    case "nominate":
                        message.channel.send("```!nominate [album] - [artist]```\nNominate an album of the year, only to be given an error back. Blame Bus.");
                        break;
                    case "poll":
                        message.channel.send("```!poll - [question] - [option 1] - [option 2]```\nCreate a poll to be voted on using reactions. This will be fleshed out more later.");
                        break;
                    case "roll":
                        message.channel.send("```!roll (d)[upper limit]\n!roll (d)[lower limit]-(d)[upper limit]```\nRoll an n-sided die. Examples:```!roll d20\n!roll 6\n!roll 5-10```");
                        break;
                    default:
                        message.channel.send("Command not found. Use:```!help``` for list of available commands.");
                        break;
                }
                break;
            default:
                break;
        }
    }

    //The never-ending debate
    else if (message.content.toLowerCase() === "all women are queens") {
        playSong(message, './Queens.mp3');
    }

    //Enforce some positivity
    else if (isQuestion(message.content)) {
        playSong(message, './Doable.mp3');
        message.react(message.channel.client.emojis.find(isDoable));
    }

    //What the HECK!!!!
    else if (isItChristian(message));

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

    //Don't make fun of links
    else if (message.content.toUpperCase().startsWith('HTTP')) {
        return;
    }

    //Random chance to make fun of you
    else if (Math.floor(Math.random() * 20) === 0) {
        message.channel.send(spongeMock(message.content));
    }
});

client.login(process.env.BOT_TOKEN);

function playSong(message, song) {
    message.member.voiceChannel.join().then(connection => {
        const dispatcher = connection.playFile(song);
        dispatcher.on("end", end => {
            message.member.voiceChannel.leave();
        });
    }).catch(error => console.log(error));
}

function spongeMock(messageText) {
    toggle = true;
        mock = "";
        for(i = 0; i < messageText.length; i++) {
            mock += toggle ? messageText[i].toUpperCase() : messageText[i].toLowerCase();
            if (messageText[i].match(/[a-z]/i)) {
                toggle = !toggle;
            }
        }
    return mock;
}

function isQuestion(message) {
    return (message.toLowerCase().startsWith("can") || 
        message.toLowerCase().startsWith("could") || 
        message.toLowerCase().startsWith("would") || 
        message.toLowerCase().startsWith("will")) &&
        message.endsWith('?');
};

function isDoable(emoji) {
    return emoji.name === "thatsdoable";
};

function pollReactions(message) {
    message.react('🔵');
    message.react('🔴');
}

function checkForDorse(message, messages) {
    console.log(messages);
    if (messages.length > 1 && messages[1].content == message.content) {
        message.reply("dorse");
    }
}

function isItChristian(message) {
    swears = ['anal','arse',' ass ','asshole','balls','bastard','bitch',
    'biatch','anus','bloody','blowjob','blow job','bollock','boner',
    'boob','bugger','bum','butt','clitoris','cock','coon','crap',
    'cuck','cunt','damn','dick','dildo','dyke','fag','feck','todger',
    'fellate','fellatio','felching','fuck','fudgepacker','fudge packer',
    'flange','goddamn','hell','homo','jizz','knobend','labia','wtf',
    'lmao','lmfao','muff','nigger','nigga','omg','penis','piss','poop',
    'prick','pube','pussy','queer','scrotum','sex','shit','slut','smegma',
    'spunk','thot','tit','tosser','turd','twat','vagina','wank','whore']

    badWord = false;

    for (i = 0; i < swears.length; i++) {
        if (message.content.toLowerCase().indexOf(swears[i]) !== -1) {
            badWord = true;
            message.reply("Friendly reminder that this is a **Christian** chatroom! :cat:");
            break;
        }
    }
    
    return badWord;
}

/*TODO:

Ideas
-----
Calculate GBPs
- for swearing
!punish
connect 4

Code
----
String resources
refactor god class
caching

*/