//Other concepts for voting:
//  Pure Democracy
//  Shareholder votes
//  Shareholder chance
//      would require vote cooldown

//TODO: Make sure they are still top 3 after vote passes

const { react } = require('../utils.js');

module.exports = {
    name: 'reset',
    description: 'Start a vote to reset the economy. If top 3 good boys™ concur, all user GBPs are set to 0 at midnight EST. Items are kept. Maximum of 1 reset per week.',
    execute(client, config, db, message, args) {
        start(client, config, db, message, args);
    }
};

async function start(client, config, db, message, args) {
    try {
        const resetData = await db.scan({ TableName: 'Resets' }).promise();
        const week = 1000 * 60 * 60 * 24 * 7;
        const now = new Date(Date.now());
        const recent = resetData.Items.filter(e => now < new Date(Date.parse(e.Date) + week));

        if (recent.length) {
            if (recent.some(e => !e.Executed)) {
                return message.reply("There is a reset scheduled for tonight! It's anarchy until then!");
            }
            else {
                const mostRecent = new Date(recent.sort((function(a, b) { return new Date(b.Date) - new Date(a.Date); }))[0].Date)
                    .toLocaleString('en-US', { timeZone: config.timezone });
                return message.reply(`Please wait at least a week before the next reset. The last one was on ${mostRecent}.`);
            }
        }

        const gbpData  = await db.scan({ TableName: 'GBPs'  }).promise();
        const loanData = await db.scan({ TableName: 'Loans' }).promise();

        const goodBoys = gbpData.Items
            .filter(gbp => gbp.Username !== 'greeter-bot')
            .sort((a, b) => getTotal(b, loanData.Items) - getTotal(a, loanData.Items))
            .map(gbp => message.guild.members.cache.get(gbp.UserID))
            .filter(mbr => mbr)
            .slice(0, 3);
        
        const text = [];
        text.push(`${message.member.displayName} is calling for an economy reset!`);
        text.push(`${goodBoys.join(', ')}: we need your unanimous concurrence for the motion to pass. You have 3 minutes to decide.`);
        text.push(`Vote here: 🦀 to accept, ${client.emojis.resolve(config.ids.drops)} to decline.`);
        
        message.channel.send(text)
        .then(msg => {
            react(msg, ['🦀', config.ids.drops]);

            const gbIDs = goodBoys.map(g => g.id);

            const filter = (reaction, user) => (gbIDs.includes(user.id)) &&
                (reaction.emoji.name === '🦀' || reaction.emoji.id === config.ids.drops);

            const collector = msg.createReactionCollector(filter, { time: 180000 });
            const yepCount = {};
            yepCount[gbIDs[0]] = yepCount[gbIDs[1]] = yepCount[gbIDs[2]] = false;
            let fail = true;

            collector.on('collect', (reaction, user) => {
                if (reaction.emoji.name === '🦀') {
                    yepCount[user.id] = true;
                    if ((yepCount[gbIDs[0]] && yepCount[gbIDs[1]] && yepCount[gbIDs[2]])) {
                        fail = false;
                        reset(db, gbpData, message.channel);
                        collector.stop();
                    }
                }
                else {
                    collector.stop();
                }
            });

            collector.on('end', function() { 
                if (fail) {
                    msg.edit(msg.content + '\n\n**The motion failed. Please continue to be good boys.**');
                }
            }); 
        });
    }
    catch (err) {
        console.log(err);
        message.reply('Something went wrong.');
    }
}

function getTotal(user, loanData) {
    let total = user.GBPs + user.Stash;
    const loan = loanData.find(l => l.UserID === user.UserID);
    if (loan) {
        total -= loan.Amount;
    }
    return total;
}

function reset(db, gbpData, channel) {
    const economy = {};
    gbpData.Items.forEach(e => { 
        economy[e.UserID] = {
            GBPs: e.GBPs + e.Stash,
            HighScore: e.HighScore
        };
    });
    
    const params = {
        TableName: 'Resets',
        Item: {
            'Date': new Date(Date.now()).toString(),
            'Executed': false,
            'Economy': economy
        }
    };
    db.put(params, function(err) {
        if (err) {
            console.error('Unable to schedule reset. Error:', JSON.stringify(err, null, 2));
            channel.send('Unable to schedule reset. Pleae try again.');
        }
        else {
            console.log('Reset scheduled');
            channel.send('@everyone **The motion passed and the reset will occur at midnight EST. Visit the shop and go wild until tomorrow, then be on your best behavior!**');
        }
    });
}