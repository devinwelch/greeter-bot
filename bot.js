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

const Discord = require('discord.js');
const client = new Discord.Client();
const connectFour = require('./connect.js');

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
    //client.user.setActivity('!help for more info', { type: 'LISTENING' });
});

client.on('messageReactionAdd', (reaction, user) => {
    //Only consider reactions to greeter-bot
    if (reaction.message.member.id === client.user.id) {
        //emoji game
        if (reaction.message.content.startsWith("**Guess the emoji**")) {
            reaction.message.clearReactions();
            newEmoji = reaction.message.guild.emojis.random(1);

            if (newEmoji.id === reaction.emoji.id) {
                reaction.message.edit(user.username + " wins! " + newEmoji.toString());
            }
            else {
                reaction.message.edit("**Guess the emoji** again (using reactions): " + message.guild.emojis.random(1).toString());
            }
        }

        //connect four
        if (false && reaction.message.content.startsWith("Connect 4!")) {
            let board = new connectFour.ConnectFour(reaction.message.content);
            switch(reaction.emoji.name) {
                case "one":
                    board.placePiece(0);
                    break;
                case "two":
                    board.placePiece(1);
                    break;
                case "three":
                    board.placePiece(2);
                    break;
                case "four":
                    board.placePiece(3);
                    break;
                case "five":
                    board.placePiece(4);
                    break;
                case "six":
                    board.placePiece(5);
                    break;
                case "seven":
                    board.placePiece(6);
                    break;
                default:
                    break;
            }
            reaction.messsage.edit(board.getBoard());
        }
    }   
});

client.on('message', message => {
    //Bots don't talk to bots nor links
    if (message.author.bot || message.content.toUpperCase().startsWith('HTTP')) {
        return;
    }

    //Stop spammers in their tracks
    message.channel.fetchMessages({limit: 100})
        .then(messages => {
            filteredMessages = messages.findAll('author', message.author);
            if (filteredMessages.length > 1 &&
                filteredMessages[1].content == filteredMessages[0].content &&
                filteredMessages[0].attachments.array().length === 0) {
                message.reply("dorse");
            }
        })
        .catch(console.error);

    //!Bot commands
    if (message.content[0] === '!') {
        cmd = message.content.split(/[\s!]+/)[1].toLowerCase();
        params = message.content.substring(cmd.length + 1, message.content.length).trim();
        quick = false;
        switch(cmd) {
            //Play games with your buddies
            case "challenge":
            case "connect":
                let board = new connectFour.ConnectFour();
                message.channel.send(board.getBoard())
                    .then(game => gameReactions(game))
                    .catch(console.error());
                break;
            //The League of Legends of emoji guessing
            case "emoji":
                message.channel.send("**Guess the emoji** (using reactions)");
                break;
            //Play a beautiful serenade
            case "exposed":
                playSong(message, 'Exposed.mp3');
                break;
            //Nominate an AOTY
            /*case "nominate":
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
                break;*/
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
            case "rollfast":
                quick = true;
            case "roll":
                if (/(d?|\d+d)\d+(-\d+)?/.test(params)) {
                    numberOfRolls = 1;
                    if (/\d+d.+/.test(params)) {
                        numberOfRolls = params.split(/d/)[0];
                        if (numberOfRolls > 10) quick = true;
                    }

                    rollMessage = message.author.username + " rolled ";

                    numbers = params.replace(/(\d+d|d)/, '').split(/-/);
                    max = numbers.length === 2 ? Number(numbers[1]) : Number(numbers[0]);
                    min = numbers.length === 2 ? Number(numbers[0]) : 1;

                    if (quick) {
                        for(i = 0; i < numberOfRolls; i++) {
                            roll = Math.floor(Math.random() * (max - min + 1)) + min;
                            rollMessage += "**" + roll + "**";
                            if (i !== numberOfRolls - 1) rollMessage += ", ";
                        }
                        message.channel.send(rollMessage);
                        break;
                    }
                    
                    message.channel.send(rollMessage)
                        .then(editMessage => slowRoll(editMessage, min, max, numberOfRolls))
                        .catch(console.error);
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
                        message.channel.send("Available commands: **!exposed**, **!poll**, **!roll**, and **!rollfast**. Use:\n```!help [command name]``` to find out more about a specific command.");
                        break;
                    case "exposed":
                        message.channel.send("Play a beautiful serenade in the voice channel the user is currently in.");
                        break;
                    case "help":
                        helpResponse = spongeMock("My name is " + message.author.username + " and I think I'm soooo clever.");
                        message.channel.send(helpResponse);
                        break;
                    case "poll":
                        message.channel.send("```!poll [question]? [option 1]; [option 2]; ...```\nCreate a poll with up to 4 options (semicolon-separated) to be voted on using reactions.");
                        break;
                    case "roll":
                        message.channel.send("```!roll (x)(d)[upper limit]\n!roll (x)(d)[lower limit]-(d)[upper limit]```\nRoll an n-sided die x times; 'd' character is optional except for multi-rolls. Examples:```!roll 20\n!roll 3d6\n!roll 5-10```");
                        break;
                    case "rollfast":
                        message.channel.send("Roll without pauses. See **!help roll** for more information.");
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

    //Sweet dreams!
    else if (/.*:(g|Gr)oose:.*:k?night:.*/.test(message.content)) {
        playSong(message, 'goosenight.wav');
    }

    //What the HECK!!!!
    else if (isNotChristian(message)) {
        message.reply("Hell yeah MOTHERFUCKER!!! " + message.guild.emojis.random(1).toString());
        //message.reply("Friendly reminder that this is a **Christian** chatroom! :cat:");
    }

    //The never-ending debate
    else if (message.content.toLowerCase() === "all women are queens") {
        playSong(message, 'Queens.mp3');
    }

    //Enforce some positivity
    else if (isQuestion(message.content)) {
        playSong(message, 'Doable.mp3');
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

    //Random chance to make fun of you or scream at you
    else if (Math.floor(Math.random() * 20) === 0) {
        if (Math.floor(Math.random() * 4) === 0 && message.member.voiceChannel !== undefined) {
            playSong(message, "Ree.mp3");
        }
        else {   
            message.channel.send(spongeMock(message.content));
        }
    }
});

client.login(process.env.BOT_TOKEN);

function slowRoll(message, min, max, count) {
    sleep(2000);
    if (count-- === 0) return;

    roll = Math.floor(Math.random() * (max - min + 1)) + min;
    rollMessage = " **" + roll + "**";
    if (count !== 0) rollMessage += ", ";

    message.edit(message.content + rollMessage)
        .then(thisMessage => slowRoll(thisMessage, min, max, count));
}

function sleep(miliseconds) {
    var currentTime = new Date().getTime();
    while (currentTime + miliseconds >= new Date().getTime()) {}
 }

 function gameReactions(boardMessage) {
    boardMessage.react("1️⃣");
    boardMessage.react("2️⃣");
    boardMessage.react("3️⃣");
    boardMessage.react("4️⃣");
    boardMessage.react("5️⃣");
    boardMessage.react("6️⃣");
    boardMessage.react("7️⃣");
 }

function playSong(message, song) {
    if (message.member.voiceChannel !== undefined && message.member.voiceChannel.guild.id === message.guild.id) {
        message.member.voiceChannel.join().then(connection => {
            const dispatcher = connection.playFile("./Sounds/" + song);
            dispatcher.on("end", end => {
                message.member.voiceChannel.leave();
            });
        }).catch(error => console.log(error));
    }
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