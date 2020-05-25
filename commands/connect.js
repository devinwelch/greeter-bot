const { getRandom, updateGBPs } = require('../utils.js');

const columns = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣'];
const blank  = '⚪';
const red    = '🔴';
const yellow = '🟡';

module.exports = {
    name: 'connect',
    description: 'Play Connect 4 against a friend. Put some GBPs on the line if you want! 120s turn timer.',
    aliases: ['challenge'],
    usage: '[wager] <@user>',
    execute(client, config, db, message, args) {
        //change IDs for test server; should be commented in production
        config.ids.yeehaw = '700795024551444661';
        config.ids.baba   = '700795091501056111';

        //input sanitization
        if (!message.mentions.members.size) {
            return message.reply('Please @ a user!');
        }
        const wager = /\d+ .+/.test(args) ? Math.floor(args.trim().split(' ', 1)[0]) : 0;
        const challenger = message.author;
        const target = message.mentions.members.first().user;
        
        if (target.id === client.user.id) {
            return message.reply("I'm not smart enough to play... *yet*.");
        }
        else if (target.id === message.author.id) {
            return message.reply('Quit playing with yourself!');
        }
        else if (wager < 0) {
            return message.reply('Make it a real challenge.');
        }

        //check GBPs for challenger and target
        const params = {
            RequestItems: {
                'GBPs': {
                    Keys: [
                        { UserID: challenger.id },
                        { UserID: target.id }
                    ]
                }
            }
        };

        db.batchGet(params, function (err, data) {
            //error in query
            if (err) {
                console.log(err);
            }
            //error in response
            else if (!data.Responses || !data.Responses.GBPs) {
                console.log('There was an error getting GBP data for challenger/target');
            }
            else {
                const challengerData = data.Responses.GBPs.find(d => d.UserID === challenger.id);
                const targetData = data.Responses.GBPs.find(d => d.UserID === target.id);

                //challenger or target not found
                if (!challengerData) {
                    return console.log('Cannot find challenger data');
                }
                if (!targetData) {
                    return console.log('Cannot find target data');
                }

                //challenger or target cannot match wager
                if (wager) {
                    if (challengerData.GBPs < wager) {
                        return message.reply(`Hang on there, slick! You only have ${challengerData.GBPs} GBPs!`);
                    }
                    if (targetData.GBPs < wager) {
                        return message.reply(`${target.displayName} can't match that bet!`);
                    }
                }

                //send duel invite
                sendInvite(client, config, db, message.channel, challenger, target, wager);
            }
        });
    }
};

function sendInvite(client, config, db, channel, challenger, target, wager) {
    const invite = [];
    invite.push(`${target.username}! ${challenger.username} challenges you to Connect 4 for ${wager ? `**${wager} GBPs**` : 'fun'}!`);
    invite.push('React here:');
    invite.push(`${client.emojis.cache.get(config.ids.yeehaw)}- accept`);
    invite.push(`${client.emojis.cache.get(config.ids.baba  )}- decline/cancel`);

    channel.send(invite)
    .then(msg => {
        try {
            msg.react(config.ids.yeehaw);
            msg.react(config.ids.baba);
        }
        catch (err) {
            console.error(err);
        }
        
        //await reactions for up to 60 sec
        const filter = (reaction, user) => user.id !== client.user.id;
        const collector = msg.createReactionCollector(filter, { time: 120000 });

        collector.on('collect', (reaction, user) => {
            //challenger or target
            if (user.id === challenger.id || user.id === target.id) {
                //target accepts
                if (reaction.emoji.id === config.ids.yeehaw && user.id === target.id) {
                    start(db, channel, challenger, target, wager);
                    collector.stop();
                }
                //duel is canceled
                else if (reaction.emoji.id === config.ids.baba) {
                    collector.stop();
                }
            }
        });

        //delete invite after accepted/rejected
        collector.on('end', function() {
            msg.delete().catch(console.error); 
        }); 
    })
    .catch(console.error);
}

function start(db, channel, challenger, target, wager) {
    const b = new Board();
    const gameStart = b.getDisplay();
    let challengerTurn = getRandom(1);
    
    gameStart.push(`${challengerTurn ? challenger.username : target.username}'s turn ${challengerTurn ? red : yellow}`);
    //send game board
    channel.send(gameStart)
    .then(msg => {
        //react with column indicators
        try {
            columns.forEach(c => msg.react(c));
        }
        catch(err) {
            console.log(err);
        }

        const filter = (reaction, user) => columns.includes(reaction.emoji.name) && (user === challenger || user === target);
        const collector = msg.createReactionCollector(filter, { idle: 60000 });
        let timeout = true;

        collector.on('collect', async function(reaction, user) {
            if (((challengerTurn && user === challenger) || (!challengerTurn && user === target)) &&
                b.place(columns.indexOf(reaction.emoji.name), challengerTurn))
            {
                challengerTurn = !challengerTurn;
                const board = b.getDisplay();
                const winner = b.checkWin();
                if (winner) {
                    board.push(getWinner(db, challenger, target, wager, winner));
                    timeout = false;
                    collector.stop();
                }
                else {
                    board.push(`${challengerTurn ? challenger.username : target.username}'s turn ${challengerTurn ? red : yellow}`);
                }
                await msg.edit(board);
            }
        });

        collector.on('end', () => {
            msg.reactions.removeAll();

            //check time out loss
            if (timeout) {
                const winner = challengerTurn ? target : challenger;
                const loser  = challengerTurn ? challenger : target;

                const board = b.getDisplay();
                board.push(`**${loser.username} took too long to decide; ${winner.username} wins ${wager} GBPs.**`);
                msg.edit(board);

                if (wager) {
                    updateGBPs(db, winner, wager);
                    updateGBPs(db, loser, -wager);
                }
            }
        });
    });    
}

function getWinner(db, challenger, target, wager, win) {
    if (win === 'tie') {
        return "**It's a tie!**";
    }

    let winner;
    let loser;

    if (win === red) {
        winner = challenger;
        loser = target;
    }
    else {
        winner = target;
        loser = challenger;
    }

    if (wager) {
        updateGBPs(db, winner, wager);
        updateGBPs(db, loser, -wager);
    }

    return `**${winner.username} wins ${wager} GBPs from ${loser.username}!**`;
}

class Board {
    constructor() {
        for(var x = 0; x < 7; x++) {
            for(var y = 0; y < 6; y++) {
                if (this[x]) {
                    this[x][y] = blank;
                }
                else {
                    this[x] = { 0: blank };
                }
            }
        }
    }

    place(x, redTurn) {
        for (var y = 0; y < 6; y ++) {
            if (this[x][y] === blank) {
                this[x][y] = redTurn ? red : yellow;
                return true;
            }
        }

        return false;
    }

    checkWin() {
        //check horizontals
        for (var x = 0; x < 4; x++) {
            for (var y = 0; y < 6; y++) {
                if (this[x][y] !== blank &&
                    this[x][y] === this[x+1][y] &&
                    this[x][y] === this[x+2][y] &&
                    this[x][y] === this[x+3][y])
                {
                    return this[x][y];
                }
            }
        }

        //check verticals
        for (x = 0; x < 7; x++) {
            for (y = 0; y < 3; y++) {
                if (this[x][y] !== blank &&
                    this[x][y] === this[x][y+1] &&
                    this[x][y] === this[x][y+2] &&
                    this[x][y] === this[x][y+3])
                {
                    return this[x][y];
                }
            }
        }

        //check diagonal down-right
        for (x = 0; x < 4; x++) {
            for (y = 3; y < 7; y++) {
                if (this[x][y] !== blank &&
                    this[x][y] === this[x+1][y-1] &&
                    this[x][y] === this[x+2][y-2] &&
                    this[x][y] === this[x+3][y-3])
                {
                    return this[x][y];
                }
            }
        }

        //check diagonal down-left
        for (x = 4; x < 7; x++) {
            for (y = 3; y < 7; y++) {
                if (this[x][y] !== blank &&
                    this[x][y] === this[x-1][y-1] &&
                    this[x][y] === this[x-2][y-2] &&
                    this[x][y] === this[x-3][y-3])
                {
                    return this[x][y];
                }
            }
        }

        //check tie
        for (x = 0; x < 7; x++) {
            for (y = 0; y < 6; y++) {
                if (this[x][y] === blank) {
                    //no tie
                    return false;
                }
            }
        }

        return 'tie';
    }

    getDisplay() {
        const message = [columns.join('')];

        for(var y = 5; y >= 0; y--) {
            const row = [];
            for(var x = 0; x < 7; x++) {
                row.push(this[x][y]);
            }
            message.push(row.join(''));
        }

        message.push(columns.join(''));

        return message;
    }
}