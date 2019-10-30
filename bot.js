/*TODO:

Ideas
-----
Calculate GBPs
- for swearing
!punish
- loud noise during talk
connect 4

Code
----
String resources
refactor god class
caching

*/

const Discord = require('discord.js')
const client = new Discord.Client()
const ytdl = require('ytdl-core')
//const connectFour = require('./connect.js')
var schedule = require('node-schedule')
var fs = require('fs')

var themeSong = []
var swears = []

client.on('ready', () => {
    console.log('I am ready!')
    //client.user.setActivity('all your chats', { type: 'LISTENING' })
    //    .catch(console.error)
})

//play theme song upon entering
client.on('voiceStateUpdate', (oldMember, newMember) => {
	me = newMember.guild.me
	you = newMember.user.username
	
    if (newMember.id === me.id ||					//member is greeter-bot
		me.voiceChannel !== undefined ||    		//greeter-bot is talking
        newMember.voiceChannel === undefined || 	//user isn't in voice channel
        newMember.selfDeaf ||                   	//user is deafened
        newMember.selfMute ||                   	//user is muted
        themeSong.indexOf(newMember.id) !== -1) {	//user has played song today
		return
	}
		
	playMe(you, newMember.voiceChannel, true, true)
    themeSong.push(newMember.id)
	console.log(you + " played his/her song!")
})

client.on('messageReactionAdd', (reaction, user) => {
    //Only consider reactions to greeter-bot
    if (reaction.message.member.id === client.user.id) {
        //emoji game
        if (reaction.message.content.startsWith("**Guess the emoji**")) {
            newEmoji = reaction.message.guild.emojis.random(1)

            if (newEmoji.id === reaction.emoji.id) {
                reaction.message.edit("**" + user.username + "** wins! " + newEmoji.toString())
            }
            else {
                reaction.message.clearReactions()
                reaction.message.edit("**Guess the emoji** again (using reactions): " + reaction.message.guild.emojis.random(1).toString())
            }
        }

        //connect four
        /*if (reaction.message.content.startsWith("Connect 4!")) {
            let board = new connectFour.ConnectFour(reaction.message.content)
            switch(reaction.emoji.name) {
                case "one":
                    board.placePiece(0)
                    break
                case "two":
                    board.placePiece(1)
                    break
                case "three":
                    board.placePiece(2)
                    break
                case "four":
                    board.placePiece(3)
                    break
                case "five":
                    board.placePiece(4)
                    break
                case "six":
                    board.placePiece(5)
                    break
                case "seven":
                    board.placePiece(6)
                    break
                default:
                    break
            }
            reaction.messsage.edit(board.getBoard())
        }*/
    } 
    
    else if (reaction.emoji.id === "309497209475563521" && Math.floor(Math.random() * 50) === 0) {
        voiceChannel = reaction.message.member.voiceChannel
        if (voiceChannel !== undefined) {
            playSong(voiceChannel, 'Alert.mp3')
        }
    }

    console.log(reaction.emoji.id)
})

client.on('message', message => {
    //Bots don't talk to bots nor links
    if (message.author.bot || message.content.toUpperCase().startsWith('HTTP')) {
        return
    }

    //Stop spammers in their tracks
    message.channel.fetchMessages({limit: 100})
        .then(messages => {
            filteredMessages = messages.findAll('author', message.author)
            if (filteredMessages.length > 1 &&
                filteredMessages[1].content == filteredMessages[0].content &&
                filteredMessages[0].attachments.array().length === 0) {
                message.reply("dorse")
            }
        })
        .catch(console.error)

    //!Bot commands
    if (message.content[0] === '!') {
        cmd = message.content.split(/[\s!]+/)[1].toLowerCase()
        params = message.content.substring(cmd.length + 1, message.content.length).trim()
        quick = false
        switch(cmd) {
            //Kick greeter-bot from voice
            case "begonebot":
            case "begone":
                channel = message.guild.me.voiceChannel
                if (channel !== undefined) {   
                    channel.leave()
                }
                break
            //Play games with your buddies
            case "challenge":
            case "connect":
                break
                let board = new connectFour.ConnectFour()
                message.channel.send(board.getBoard())
                    .then(game => gameReactions(game))
                    .catch(console.error())
                break
            //The League of Legends of emoji guessing
            case "emoji":
                message.channel.send("**Guess the emoji** (using reactions)")
                break
            //Play a beautiful serenade
            case "exposed":
                playSong(message.member.voiceChannel, 'ExposedHumans.mp3')
                break
            //Announce yourself
            case "me":
                user = params !== ""
                    ? params.toLowerCase() === message.author.username.toLowerCase() 
                        ? "congratulations"
                        : params 
                    : message.author.username
                
                if (fs.existsSync("./Sounds/Friends/" + user.toLowerCase() + ".mp3")) {
                    playMe(user, message.member.voiceChannel)
                }
                else {
                    message.reply("Username not found, find a sound clip and give it to Bus!")
                }
                break
            //Create a poll with reactions
            case "poll":
                options = params.split(/[\?;]/)
                pollMessage = "New poll, React to cast your ballot!\n**" + options[0].replace(/!poll\s*/, '') + "?**"
                optionsCounter = 1

                for(i = 0; i < options.length; i++) {
                    if (options[i] === "") options.splice(i, 1)
                }
                
                switch(options.length) {
                    case 0:
                    case 1: 
                        pollMessage = "Invalid format, use **!help poll** for more information."
                        break
                    case 2:
                        pollMessage = "Don't be a communist, please use multiple options!"
                        break
                    case 3:
                    case 4:
                    case 5:
                        pollMessage += "\n🔵 - " + options[1].trim()
                        pollMessage += "\n🔴 - " + options[2].trim()
                        if (options.length > 3) {
                            pollMessage += "\n⚫ - " + options[3].trim()
                            if (options.length === 5) pollMessage += "\n⚪ - " + options[4].trim()
                        }
                        break
                    default:
                        pollMessage = "Too many options, I can't choose!"
                        break
                }
                message.channel.send(pollMessage)
                    .then(poll => {
                        if (options.length > 2 && options.length < 6) {
                            poll.react('🔴')
                            poll.react('🔵')
                            if (options.length > 3) {
                                poll.react('⚫')
                                if (options.length === 5) poll.react('⚪')
                            }
                        }
                    })
                .catch(console.error)
                break
            //For D&D nerds mostly
            case "rollfast":
                quick = true
            case "roll":
                if (/(d?|\d+d)\d+(-\d+)?/.test(params)) {
                    numberOfRolls = 1
                    if (/\d+d.+/.test(params)) {
                        numberOfRolls = params.split(/d/)[0]
                        if (numberOfRolls > 10) quick = true
                    }

                    rollMessage = message.author.username + " rolled "

                    numbers = params.replace(/(\d+d|d)/, '').split(/-/)
                    max = numbers.length === 2 ? Number(numbers[1]) : Number(numbers[0])
                    min = numbers.length === 2 ? Number(numbers[0]) : 1

                    if (quick) {
                        for(i = 0; i < numberOfRolls; i++) {
                            roll = Math.floor(Math.random() * (max - min + 1)) + min
                            rollMessage += "**" + roll + "**"
                            if (i !== numberOfRolls - 1) rollMessage += ", "
                        }
                        message.channel.send(rollMessage)
                        quick = false
                        break
                    }
                    
                    message.channel.send(rollMessage)
                        .then(editMessage => slowRoll(editMessage, min, max, numberOfRolls))
                        .catch(console.error)
                }
                else {
                    message.reply("Invalid format, use **!help roll** for more information.")
                }
                break
            //Bus is all powerful
            case "say":
                if (message.author.id === "142444696738856960") client.channels.get("466065580252725288").send(params)
                else console.log(message.author.username + " is trying to control me!")
                break
            case "sing":
                voiceChannel = message.member.voiceChannel
                params = params.split(' ')
                song = params[0]
                const streamOptions = { seek: params.length > 1 ? params[1] : 0, volume: 0.5 }

                voiceChannel.join()
                .then(connection => {
                    const stream = ytdl(song, { filter : 'audioonly' })
                    const dispatcher = connection.playStream(stream, streamOptions)
                    dispatcher.on("end", () => {
                        voiceChannel.leave()
                    })
                    setTimeout(() => dispatcher.end(), 10000)
                })
                .catch(console.error);

                message.delete()
                .then(msg => console.log(`${msg.author.username} sang ${song}`))
                .catch(console.error)

                break
            //Find out what greeter-bot can do
            case "help":
                switch(params.replace('!', '')) {
                    case null:
                    case "":
                        message.channel.send("Available commands: **!begone**, **!emoji**, **!exposed**, **!me**, **!poll**, **!roll**, and **!rollfast**. Use:\n```!help [command name]``` to find out more about a specific command.")
                        break
                    case "begone":
                        message.channel.send("Kick greeter-bot out of the voice channel. Alias: begonebot")
                        break
                    case "emoji":
                        message.channel.send("Add reactions to guess the next random emoji. Will only select server-specific emojis. Winner *should* be announced after successful guess!")
                        break
                    case "exposed":
                        message.channel.send("Play a beautiful serenade in the voice channel the user is currently in.")
                        break
                    case "help":
                        message.channel.send(spongeMock("My name is " + message.author.username + " and I think I'm soooo clever."))
                        break
                    case "me":
                        message.channel.send("Play a personalized greeting. If not set up, contact Bus. To play another user's sound:\n```!me [username]```")
                        break
                    case "poll":
                        message.channel.send("```!poll [question]? [option 1]; [option 2]; ...```\nCreate a poll with up to 4 options (semicolon-separated) to be voted on using reactions.")
                        break
                    case "roll":
                        message.channel.send("```!roll (x)(d)[upper limit]\n!roll (x)(d)[lower limit]-(d)[upper limit]```\nRoll an n-sided die x times 'd' character is optional except for multi-rolls. Examples:```!roll 20\n!roll 3d6\n!roll 5-10```")
                        break
                    case "rollfast":
                        message.channel.send("Roll without pauses. See **!help roll** for more information.")
                        break
                    default:
                        message.channel.send("Command not found. Use:```!help``` for list of available commands.")
                        break
                }
                break
            //Don't forget me
            default:
                for (let member of message.guild.members.array()) {
                    if (cmd.toLowerCase() === member.user.username.toLowerCase()) {
                        message.react(client.emojis.get("309497209475563521"))
                            .catch(console.error)
                        break
                    }
                }
                break
        }
    }

    //Hello Troll on Q
    else if (message.content.toLowerCase().indexOf("hello") !== -1) {
        message.reply("Hey it's me, Q! JK it's Bwandy hehe")
    }

    //Sweet dreams!
    else if (/.*:gr?oose:.*:k?night:.*/.test(message.content)) {
        playSong(message.member.voiceChannel, 'goosenight.wav')
    }

    //Sweet memes!
    else if (/.*:gr?oose:.*:day:.*/.test(message.content)) {
        playSong(message.member.voiceChannel, 'Goose day.mp3')
    }

    //What the HECK!!!!
    else if (isNotChristian(message)) {
        var date = new Date()
        var filterText = "Friendly reminder that this is a **Christian** chatroom! "
        if (date.getDay() === 0) {
            filterText += "Please respect the Lord's day of rest. "
        }
        message.reply(filterText + message.guild.emojis.random(1).toString())
    }

    //The never-ending debate
    else if (message.content.toLowerCase() === "all women are queens") {
        playSong(message.member.voiceChannel, 'Queens.mp3')
    }

    //Enforce some positivity
    else if (isQuestion(message.content)) {
        playSong(message.member.voiceChannel, 'Doable.mp3')
        message.react(message.channel.client.emojis.find(isDoable))
    }

    //Man's not hot
    else if (message.content === "ting") {
        message.channel.send("SKKKKRRRA")
        message.channel.send("POP POP KOT KOT KOT")
        message.channel.send("SKIBIKI POP POP... AND A PU PU PUDRRR BOOM")
        message.channel.send("SKYA, DU DU KU KU DUN DUN")
        message.channel.send("*POOM* *POOM*")
    }

    //Ping pong ding dong!
    else if (message.content.endsWith('ing') && message.content.match(/^[A-Za-z]+$/)) {
        newMessage = message.content.substr(0, message.content.length - 3) + 'o' + message.content.substr(message.content.length - 2, message.content.length + 1)
        message.reply(newMessage)
    }

    //Random chance to make fun of you or scream at you
    else if (Math.floor(Math.random() * 20) === 0) {
        if (Math.floor(Math.random() * 4) === 0 && message.member.voiceChannel !== undefined) {
            playSong(message.member.voiceChannel, "Ree.mp3")
            message.react(client.emojis.get("241629835166744576"))
                .catch(console.error)
        }
        else {   
            message.channel.send(spongeMock(message.content))
        }
    }
})

client.login(process.env.BOT_TOKEN)

//Tell the time
schedule.scheduleJob('0 4-23 * * 3', function() {
    declareDay()
})
schedule.scheduleJob('0 0-3 * * 4', function() {
    declareDay()
})

//Holiday anthem
schedule.scheduleJob('* 4-23 11 4 *', function() {
    jam("411.mp3")
})
schedule.scheduleJob('* 0-3 12 4 *', function() {
    jam("411.mp3")
})

schedule.scheduleJob('* 4-23 21 9 *', function() {
    jam("921.mp3")
})
schedule.scheduleJob('* 0-3 22 9 *', function() {
    jam("921.mp3")
})

//Reset theme songs
schedule.scheduleJob('0 0 * * *', function() {
    console.log("Resetting theme songs")
    themeSong = []
})

function playMe(name, voiceChannel, gnomed = false, noKnock = false) {
	path = ''
	
	if (gnomed &&
		voiceChannel.members.array().length > 1 &&
		Math.floor(Math.random() * 12) === 0) {
		path = 'gnomed.mp3'
	}
	else {
		regex = RegExp('^' + name.toLowerCase())
		files = fs.readdirSync('./Sounds/Friends/').filter(file => regex.test(file))
		
		if (files.length === 0) {
			return
		}
		
		path = 'Friends/' + files[Math.floor(Math.random() * files.length)]
	}
	
	playSong(voiceChannel, path, noKnock)
}

function jam(songName) {
    if (client.voiceConnections.get('143122983974731776') === undefined) {
        client.channels.get('565655168876675088').join().then(connection => {
            function play(connection) {
                const dispatcher = connection.playFile("./Sounds/" + songName)
                dispatcher.on('end', () => { 
                    play(connection);
                });
            }
            play(connection)
        }).catch(error => console.log(error))
    }
}

//silly skeleton man
schedule.scheduleJob('* 4-23 29 10 *', function() {
    spook()
})
schedule.scheduleJob('* 0-3 1 11 *', function() {
    spook()
})
function spook() {
    /*let voiceChannel = client.channels
        .filter(channel => channel.bitrate !== undefined)
        .sort(function (channel1, channel2) { return channel2.members.array().length - channel1.members.array().length })
        .first()*/

    voiceChannel = client.channels.get('143133300993556481')

    console.log('start:')
    console.log(voiceChannel)
    console.log(client.voiceConnections.get(voiceChannel.guild.id))
    
    if (voiceChannel !== undefined && client.voiceConnections.get(voiceChannel.guild.id) === undefined) {
        voiceChannel.join().then(connection => {
            seekrng = Math.floor(Math.random() * 111)
            const dispatcher = connection.playFile("./Sounds/Sans.mp3", { seek: rng })
            dispatcher.on("end", () => {
                voiceChannel.leave()
            })
            lengthrng = 1000 * (Math.floor(Math.random() * 11) + 5)
            setTimeout(() => dispatcher.end(), lengthrng)
        }).catch(error => console.log(error))
    }
}

function declareDay() {
    let popularChannel = client.channels
        //find voice channels
        .filter(channel => channel.bitrate !== undefined)
        //sort by most members
        .sort(function (channel1, channel2) { return channel2.members.array().length - channel1.members.array().length })
        .first()

        playSong(popularChannel, "Wednesday.mp3", true)
}

function slowRoll(message, min, max, count) {
    sleep(2000)
    if (count-- === 0) return

    roll = Math.floor(Math.random() * (max - min + 1)) + min
    rollMessage = " **" + roll + "**"
    if (count !== 0) rollMessage += ", "

    message.edit(message.content + rollMessage)
        .then(thisMessage => slowRoll(thisMessage, min, max, count))
}

 /*function gameReactions(boardMessage) {
    boardMessage.react("1️⃣")
    boardMessage.react("2️⃣")
    boardMessage.react("3️⃣")
    boardMessage.react("4️⃣")
    boardMessage.react("5️⃣")
    boardMessage.react("6️⃣")
    boardMessage.react("7️⃣")
 }*/

function playSong(voiceChannel, song, noKnock = false) {
    if (voiceChannel !== undefined && client.voiceConnections.get(voiceChannel.guild.id) === undefined) {
        //APRIL PRANKS
        d = new Date()
        if (d.getMonth() === 3 && d.getDate() === 1) {
            song = "gnomed.mp3"
        }
        voiceChannel.join().then(connection => {
            const dispatcher = connection.playFile("./Sounds/" + song)
            dispatcher.on("end", () => {
                if (!noKnock && Math.floor(Math.random() * 6) === 0) {
                    sleep(5000)
                    let num = Math.floor(Math.random() * 3) + 1
                    const knocker = connection.playFile("./Sounds/knock" + num.toString() + ".mp3")
                    knocker.on("end", () => {
                        voiceChannel.leave()
                    })
                }
                else {
                    voiceChannel.leave()
                }
            })
        }).catch(error => console.log(error))
    }
}

function sleep(miliseconds) {
    var currentTime = new Date().getTime()
    while (currentTime + miliseconds >= new Date().getTime()) {}
 }

function spongeMock(messageText) {
    toggle = true
        mock = ""
        for(i = 0; i < messageText.length; i++) {
            mock += toggle ? messageText[i].toUpperCase() : messageText[i].toLowerCase()
            if (messageText[i].match(/[a-z]/i)) {
                toggle = !toggle
            }
        }
    return mock
}

function isQuestion(message) {
    return (message.toLowerCase().startsWith("can") || 
        message.toLowerCase().startsWith("would") || 
        message.toLowerCase().startsWith("will")) &&
        message.endsWith('?')
}

function isDoable(emoji) {
    return emoji.name === "thatsdoable"
}

function isNotChristian(message) {
    if (swears.length === 0) {
        swears = fs.readFileSync('./swears.txt').toString().split("\n");
    }

    for (i = 0; i < swears.length; i++) {
        if (message.content.toLowerCase().indexOf(swears[i]) !== -1) {
            if (message.content.toLowerCase().indexOf("hello") !== -1) continue
            return true
        }
    }
    
    return false
}
