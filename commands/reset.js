//Other concepts for voting:
//Pure Democracy
//Shareholder votes
//Shareholder chance
//  would require vote cooldown

//Require minimum economy size before resetting?
//Wealth gap between 3 & 4?

const self = module.exports = {
    name: 'reset',
    description: 'Start a vote to reset the economy. If top 3 good boys™ concur, all user GBPs are set to 0 at midnight EST. Items are kept. Maximum of 1 reset per week.',
    execute(client, config, db, message, args) {
        db.scan({ TableName: 'Resets' }, function (err, resetData) {
            if (err) {
                console.log('Unable to query Resets:', JSON.stringify(err, null, 2));
            }
            else {
                const week = 1000 * 60 * 60 * 24 * 7;
                const now = new Date(Date.now());
                const recent = resetData.Items.filter(e => now < new Date(Date.parse(e.Date) + week));

                if (recent.length) {
                    if (recent.some(e => !e.Executed)) {
                        return message.reply("There is a reset scheduled for tonight! It's anarchy until then!");
                    }
                    else {
                        const mostRecent = recent.sort((function(a, b) { return new Date(b.Date) - new Date(a.Date); }))[0];
                        return message.reply(`Please wait at least a week before the next reset. The last one was on ${new Date(mostRecent.Date).toDateString()}.`);
                    }
                }

                db.scan({ TableName: 'GBPs'}, function(err, gbpData) {
                    if (err) {
                        return console.error('Unable to get leaderboard. Error:', JSON.stringify(err, null, 2));
                    }
                    else {
                        const sorted = gbpData.Items.filter(e => e.Username !== 'greeter-bot')
                            .sort(function(a, b) { return b.GBPs - a.GBPs; });
                        const gb1 = message.guild.members.cache.get(sorted[0].UserID);
                        const gb2 = message.guild.members.cache.get(sorted[1].UserID);
                        const gb3 = message.guild.members.cache.get(sorted[2].UserID);
                        
                        const text = [];
                        text.push(`${message.member.displayName} is calling for an economy reset!`);
                        text.push(`${gb1}, ${gb2}, ${gb3}: we need your unanimous concurrence for the motion to pass. You have 3 minutes to decide.`);
                        text.push(`Vote here: 🦀 to accept, ${client.emojis.cache.get(config.ids.drops)} to decline.`);

                        message.channel.send(text)
                            .then(m => {
                                m.react('🦀');
                                m.react(config.ids.drops);

                                const filter = (reaction, user) => (user.id === gb1.id || user.id === gb2.id || user.id === gb3.id) &&
                                    (reaction.emoji.name === '🦀' || reaction.emoji.id === config.ids.drops);

                                const collector = m.createReactionCollector(filter, { time: 180000 });
                                const yepCount = {};
                                yepCount[gb1.id] = yepCount[gb2.id] = yepCount[gb3.id] = false;
                                let fail = true;

                                collector.on('collect', (reaction, user) => {
                                    if (reaction.emoji.name === '🦀') {
                                        yepCount[user.id] = true;
                                        if ((yepCount[gb1.id] && yepCount[gb2.id] && yepCount[gb3.id])) {
                                            fail = false;
                                            self.reset(db, gbpData, message.channel);
                                            collector.stop();
                                        }
                                    }
                                    else {
                                        console.log('stopped');
                                        collector.stop();
                                    }
                                });

                                collector.on('end', function() { 
                                    if (fail) {
                                        m.edit(m.content + '\n\n**The motion failed. Please continue to be good boys.**');
                                    }
                                }); 
                            })
                            .catch(console.error);
                    }
                });
            }
        });
    },
    reset(db, gbpData, channel) {
        const economy = {};
        gbpData.Items.forEach(e => { 
            economy[e.UserID] = {
                GBPs: e.GBPs,
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
                channel.send('**The motion passed and the reset will occur at midnight EST. Visit the shop and go wild until tomorrow, then be on your best behavior!**');
            }
        });
    }
};