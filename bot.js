/*TODO:

Ideas
-----
Calculate GBPs
- for swearing
!punish
connect 4
slow roll

Code
----
String resources
refactor god class
caching

*/

const Discord = require('discord.js');
const client = new Discord.Client();

/* SQL stuff not working, keep it here for now
var pg = require('pg');
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
    //Bots don't talk to bots nor links
    if (message.author.bot || message.content.toUpperCase().startsWith('HTTP')) {
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
                options = params.split(/[\?;]/);
                pollMessage = "New poll, React to cast your ballot!\n**" + options[0].replace(/!poll\s*/, '') + "?**";
                optionsCounter = 1;

                for(i = 0; i < options.length; i++) {
                    if (options[i] === "") options.splice(i, 1);
                }
                
                switch(options.length) {
                    case 0:
                    case 1: 
                        pollMessage = "Invalid format, use **!help** for more information.";
                        break;
                    case 2:
                        pollMessage = "Don't be a communist, please use multiple options!";
                        break;
                    case 3:
                    case 4:
                    case 5:
                        pollMessage += "\n🔵 - " + options[1].trim();
                        pollMessage += "\n🔴 - " + options[2].trim();
                        if (options.length > 3) {
                            pollMessage += "\n⚫ - " + options[3].trim();
                            if (options.length === 5) pollMessage += "\n⚪ - " + options[4].trim();
                        }
                        break;
                    default:
                        pollMessage = "Too many options, I can't choose!";
                        break;
                }
                message.channel.send(pollMessage)
                .then(poll => {
                    if (options.length > 2 && options.length < 6) {
                        poll.react('🔴');
                        poll.react('🔵');
                        if (options.length > 3) {
                            poll.react('⚫');
                            if (options.length === 5) poll.react('⚪');
                        }
                    }
                })
                .catch(console.error);
                break;
            //For D&D nerds mostly
            case "roll":
                if (/(d?|\d+d)\d+(-\d+)?/.test(params)) {
                    rollMessage = message.author.username + " rolled ";

                    numberOfRolls = 1;
                    if (/\d+d.+/.test(params)) {
                        numberOfRolls = params.split(/d/)[0];
                    }

                    numbers = params.replace(/(\d+d|d)/, '').split(/-/);
                    max = numbers.length === 2 ? Number(numbers[1]) : Number(numbers[0]);
                    min = numbers.length === 2 ? Number(numbers[0]) : 1;
                    
                    for(i = 0; i < numberOfRolls; i++) {
                        roll = Math.floor(Math.random() * (max - min + 1)) + min;
                        rollMessage += "**" + roll + "**";
                        if (i !== numberOfRolls - 1) rollMessage += ", ";
                    }

                    message.channel.send(rollMessage);
                }
                else {
                    message.reply("Invalid format, use **!help** for more information.");
                }
                break;
            case "test":
                message.channel.send("first this")
                    .then(thisMessage => editMore(thisMessage, 3));
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
                        message.channel.send("```!poll [question]? [option 1]; [option 2]; ...```\nCreate a poll with up to 4 options (semicolon-separated) to be voted on using reactions.");
                        break;
                    case "roll":
                        message.channel.send("```!roll (x)(d)[upper limit]\n!roll (x)(d)[lower limit]-(d)[upper limit]```\nRoll an n-sided die x times. Examples:```!roll 20\n!roll 3d6\n!roll 5-10```");
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

    //What the HECK!!!!
    else if (isNotChristian(message)) {
        message.reply("Friendly reminder that this is a **Christian** chatroom! :cat:");
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
        message.channel.send(spongeMock(message.content));
    }
});

client.login(process.env.BOT_TOKEN);

function editMore(message, count) {
    sleep(1000);
    count--;
    if (count === 0) break;
    message.edit(message.content + count)
        .then(thisMessage => editMore(thisMessage, count));
}

function sleep(miliseconds) {
    var currentTime = new Date().getTime();
 
    while (currentTime + miliseconds >= new Date().getTime()) {
    }
 }

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

function checkForDorse(message, messages) {
    if (messages.length > 1 && messages[1].content == message.content) {
        message.reply("dorse");
    }
}

function isNotChristian(message) {
    swears = ['anal','arse',' ass ','asshole','balls','bastard','bitch',
    'biatch','anus','bloody','blowjob','blow job','bollock','boner',
    'boob','bugger','bum','butt','clitoris','cock','coon','crap',
    'cuck','cunt','damn','dick','dildo','dyke','fag','feck','todger',
    'fellate','fellatio','felching','fuck','fudgepacker','fudge packer',
    'flange','goddamn','hell','homo','jizz','knobend','labia','wtf',
    'lmao','lmfao','muff','nigger','nigga','omg','penis','piss','poop',
    'prick','pube','pussy','queer','scrotum','sex','shit','slut','smegma',
    'spunk','thot','tosser','turd','twat','vagina','wank','whore']

    for (i = 0; i < swears.length; i++) {
        if (message.content.toLowerCase().indexOf(swears[i]) !== -1) {
            if (message.content.toLowerCase().indexOf("hello") !== -1) continue;
            return true;
        }
    }
    
    return false;
}