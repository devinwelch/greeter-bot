const { react, getRanks } = require('../utils.js');

module.exports = {
    name: 'reset',
    description: 'Start a vote to reset the economy. If top 3 good boys™ concur, all user GBPs are set to 0 at midnight EST. Items are kept. Maximum of 1 reset per week.',
    category: 'gbp',
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

        let data = await getRanks(db);
        
        if (!data) {
            return;
        }

        if (!getMember(message, data[0]) ||
            !getMember(message, data[1]) ||
            !getMember(message, data[2])  )
        {
            return message.reply('Not all good boys are here right now!');
        }
        
        const text = [];
        text.push(`${message.member.displayName} is calling for an economy reset!`);
        text.push(`${getName(client, message, data[0])}, ${getName(client, message, data[1])}, ${getName(client, message, data[2])}:`);
        text.push('We need your unanimous concurrence for the motion to pass. You have 3 minutes to decide.');
        text.push(`Vote here: 🦀 to accept, ${client.emojis.resolve(config.ids.drops)} to decline.`);
        
        client.resets.push(message.author.id);

        const msg = await message.channel.send(text);
        react(msg, ['🦀', config.ids.drops]);

        const filter = (reaction, user) => 
            (reaction.emoji.name === '🦀' || reaction.emoji.id === config.ids.drops) &&
            (user.id === data[0].UserID || user.id === data[1].UserID ||user.id === data[2].UserID);
        const collector = msg.createReactionCollector(filter, { time: 180000 });
        let pass = false;

        collector.on('collect', (reaction, user) => {
            if (reaction.emoji.name === '🦀') {
                const datum = data.find(d => d.UserID === user.id);
                if (datum) {
                    datum.yep = true;
                }

                if (data[0].yep && data[1].yep && data[2].yep) {
                    pass = true;
                    reset(db, data, message.channel);
                    collector.stop();
                }
            }
            else {
                collector.stop();
            }
        });

        collector.on('end', function() { 
            if (!pass) {
                msg.edit(msg.content + '\n\n**The motion failed. Please continue to be good boys.**');
            }
        }); 
    }
    catch (err) {
        console.log(err);
        message.reply('Something went wrong.');
    }
}

function getMember(message, user) {
    return message.guild.members.cache.get(user.UserID);
}

function getName(client, message, user) {
    if (client.resets.includes(message.author.id)) {
        return user.Username;
    }

    return getMember(message, user);
}

function reset(db, data, channel) {
    const economy = {};
    data.forEach(e => { 
        economy[e.UserID] = {
            GBPs: e.Worth,
            HighScore: e.HighScore
        };
    });
    console.log(economy);
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
            channel.send('Unable to schedule reset. Please try again.');
        }
        else {
            console.log('Reset scheduled');
            channel.send('@everyone **The motion passed and the reset will occur at midnight EST. Visit the shop and go wild until tomorrow, then be on your best behavior!**');
        }
    });
}