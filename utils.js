const config = require('./config.json');
const fs = require('fs');

let self = module.exports = {
    getPopularChannel(client) {
        return client.channels.cache
            .filter(channel => channel.type === 'voice')
            .sort(function (channel1, channel2) { return channel2.members.size - channel1.members.size; })
            .first();
    },
    
    declareDay(client) {
        self.playSong(client, self.getPopularChannel(client), 'Wednesday.mp3', true);
    },

    spook(client) {
        const voiceChannel = self.getPopularChannel(client);
    
        if (voiceChannel && !client.voice.connections.get(voiceChannel.guild.id)) {
            voiceChannel.join().then(connection => {
                const seekRNG = self.getRandom(110);
                const dispatcher = connection.play('./Sounds/Sans.mp3', { seek: seekRNG });
                dispatcher.on('finish', () => {
                    voiceChannel.leave();
                });
                const lengthRNG = 1000 * self.getRandom(3, 6);
                setTimeout(() => dispatcher.end(), lengthRNG);
            }).catch(error => console.log(error));
        }
    },

    jam(client, songName) {
        if (!client.voice.connections.get(config.ids.hooliganHouse)) {
            client.channels.cache.get(config.ids.holidayBangers).join().then(connection => {
                function play(connection) {
                    const dispatcher = connection.play(`./Sounds/${songName}`);
                    dispatcher.on('finish', () => { 
                        play(connection);
                    });
                }
                play(connection);
            }).catch(error => console.log(error));
        }
    },

    playSong(client, voiceChannel, song, noKnock = false) {
        if (voiceChannel && !client.voice.connections.get(voiceChannel.guild.id)) {
            //APRIL PRANKS
            const date = new Date();
            if (date.getMonth() === 3 && date.getDate() === 1) {
                song = 'gnomed.mp3';
            }
            voiceChannel.join().then(connection => {
                const dispatcher = connection.play(`./Sounds/${song}`);
                dispatcher.on('finish', () => {
                    if (!noKnock && !self.getRandom(9)) {
                        self.delay(5000).then(() => {
                            const knocker = connection.play(`./Sounds/knock${self.getRandom(1, 3).toString()}.mp3`);
                            knocker.on('finish', () => {
                                voiceChannel.leave();
                            });
                        });
                    }
                    else {
                        voiceChannel.leave();
                    }
                });
            }).catch(error => console.log(error));
        }
    },

    playMe(client, voiceChannel, name, gnomed = false, noKnock = false) {
        let path;
        
        if (gnomed &&
            voiceChannel.members.size > 1 &&
            !self.getRandom(15)) {
            path = 'gnomed.mp3';
        }
        else {
            const regex = RegExp('^' + name.toLowerCase());
            const files = fs.readdirSync('./Sounds/Friends/').filter(file => regex.test(file));
            
            if (!files.length) {
                return;
            }
            
            path = 'Friends/' + self.selectRandom(files);
        }
        
        self.playSong(client, voiceChannel, path, noKnock);
    },

    infect(client) {
        client.channels.cache.filter(channel => channel.type === 'voice').array().forEach(voiceChannel => {
            const noninfected = voiceChannel.members.filter(member => member.roles.cache.every(role => role.id !== config.ids.corona));
            
            if (noninfected.size) { 
                const infectedCount = voiceChannel.members.size - noninfected.size;
                const percentChances = [0, 10, 12, 15, 20, 30, 50, 75, 100];

                const chance = percentChances[Math.min(8, infectedCount)];
                const roll = self.getRandom(99);
        
                if (infectedCount) {
                    console.log(`Rolled ${roll} against ${chance}% odds in channel: ${voiceChannel}`);
                }
        
                if (roll < chance) {
                    const victim = noninfected.random(1)[0];
                    victim.roles.add(config.ids.corona);
                    client.channels.cache.get(config.ids.mainChat).send(`${victim.user.username} caught the coronavirus! Yuck, stay away!`);
                }
            }
        });
    },

    delay(t, v) {
        return new Promise(function(resolve) { 
            setTimeout(resolve.bind(null, v), t);
        });
    },

    selectRandom(array) {
        return array[Math.floor(Math.random() * array.length)];
    },

    getRandom(x, y) {
        let min;
        let max;

        if (y) {
            min = x;
            max = y;
        }
        else {
            min = 0;
            max = x;
        }

        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    establishGBPs(db, user, amount) {
        const params = {
            TableName: 'GBPs',
            Item: {
                'UserID': user.id,
                'Username': user.username.toLowerCase(),
                'GBPs': amount,
                'HighScore': amount,
                'Inventory': { 'fists': true, 'random': true },
                'Equipped': 'fists'
            }
        };
        db.put(params, function(err) {
            if (err) {
                console.error(`Error. Unable to add ${user.username}`);
            } else {
                console.log(`Added ${user.username}`);
            }
        });
    },

    updateGBPs(db, user, amount) {
        const gbpParams = {
            TableName: 'GBPs',
            Key: { 'UserID': user.id }
        };
    
        //find user
        db.get(gbpParams, function(err, data) {
            if (err) {
                console.error(`Error. Unable to query ${user.username}`);
            } 
            //GBPs not calculated yet
            else if (!data.Item) {
                self.establishGBPs(db, user, amount);
            } 
            //update existing user
            else {
                const loanParams = {
                    TableName: 'Loans',
                    Key: { 'UserID': user.id }
                };

                db.get(loanParams, function(err, loanData) {
                    if (err) {
                        return console.error(`Error. Unable to search Loans for ${user.username}`);
                    }
                    const loan = loanData.Item ? loanData.Item.Amount : 0;
                    if (isNaN(data.Item.HighScore)) {
                        data.Item.HighScore = 0;
                    }
                    const high = Math.max(Number(data.Item.HighScore), data.Item.GBPs + amount - loan);

                    gbpParams.UpdateExpression = 'set Username = :u, GBPs = GBPs + :amt, HighScore = :h';
                    gbpParams.ExpressionAttributeValues = { 
                        ':amt': amount,
                        ':h': high,
                        ':u': user.username.toLowerCase()
                    };
                    db.update(gbpParams, function(err) {
                        if (err) {
                            console.error('Unable to update user. Error JSON:', JSON.stringify(err, null, 2));
                        } else {
                            console.log(`Gave ${user.username} ${amount} GBPs`);
                        }
                    });
                });   
            }
        });
    },

    midnight(client, db) {
        db.scan({ TableName: 'Resets' }, function (err, data) {
            if (err) {
                console.log('Unable to check for resets:', JSON.stringify(err, null, 2));
            }
            else if (data.Items.some(e => !e.Executed)) {
                self.reset(client, db, data);
            }
            else {
                self.collectLoans(client, db);
            }
        });
    },

    reset(client, db, data) {                    
        console.log('Resetting the economy!');
        client.channels.cache.get(config.ids.exchange).send('**From the ashes we are born anew. The GBP economy has been reset. Go forth!**');
        
        data.Items.filter(r => !r.Executed).forEach(r =>{
            const resetParams = {
                TableName: 'Resets',
                Key: { 'Date': r.Date },
                UpdateExpression: 'set Executed = :t',
                ExpressionAttributeValues: { ':t': true }
            };
            db.update(resetParams, function(err) {
                if (err) {
                    console.error('Unable to mark resets. Error JSON:', JSON.stringify(err, null, 2));
                }
                else {
                    db.scan({ TableName: 'GBPs' }, function(err, gbpData) {
                        if (err) {
                            console.error('Unable get GBP data for reset. Error:', JSON.stringify(err, null, 2));
                        }
                        else {
                            gbpData.Items.forEach(user => {
                                if (Object.keys(user.Inventory).filter(k => k !== 'fists' && k !== 'random').length) {
                                    const gbpParams = {
                                        TableName: 'GBPs',
                                        Key: { 'UserID': user.UserID },
                                        UpdateExpression: 'set GBPs = :z, HighScore = :z',
                                        ExpressionAttributeValues: { ':z': 0 }
                                    };
                                    db.update(gbpParams, function(err) {
                                        if (err) {
                                            console.error('Unable to zero user. Error JSON:', JSON.stringify(err, null, 2));
                                        }
                                    });
                                }
                                else {
                                    const deleteGBP = {
                                        TableName: 'GBPs',
                                        Key:{ 'UserID': user.UserID }
                                    };
                                    
                                    db.delete(deleteGBP, function(err) {
                                        if (err) {
                                            console.error('Unable to delete user. Error:', JSON.stringify(err, null, 2));
                                        }
                                    });
                                }
                            });
                        }
                    });

                    db.scan({ TableName: 'Loans' }, function(err, loanData) {
                        if (err) {
                            console.error('Unable get Loan data for reset. Error:', JSON.stringify(err, null, 2));
                        }
                        else {
                            loanData.Items.forEach(loan => {
                                const loanParams = {
                                    TableName: 'Loans',
                                    Key:{ 'UserID': loan.UserID }
                                };
                                
                                db.delete(loanParams, function(err) {
                                    if (err) {
                                        console.error('Unable to delete Loan. Error:', JSON.stringify(err, null, 2));
                                    }
                                });
                            });
                        }
                    });
                }
            });  
        });
    },

    collectLoans(client, db) {
        db.scan({ TableName: 'Loans' }, function(err, loanData) {
            loanData.Items.forEach(function(loan) {
                const loanAmount = Math.ceil(loan.Amount * 1.1);
                const user = { 
                    id: loan.UserID,
                    username: loan.Username 
                };

                var params = {
                    TableName: 'Loans',
                    Key:{ 'UserID': loan.UserID }
                };
                
                db.delete(params, function(err) {
                    if (err) {
                        console.error('Unable to delete item. Error:', JSON.stringify(err, null, 2));
                    } else {
                        self.updateGBPs(db, user, -loanAmount);
                        self.updateGBPs(db, client.user, loanAmount);
                        client.channels.cache.get(config.ids.exchange).send(`Reclaimed ${loanAmount} GBPs from ${user.username}`);
                    }
                });
            });
        });
    },

    giveaway(client, db) {
        const members = client.guilds.cache.get(config.ids.hooliganHouse).members.cache;
        
        const jackpot = members.size;
        const winner = members.random(1)[0].user;
        self.updateGBPs(db, winner, jackpot);

        client.guilds.cache
            .get(config.ids.hooliganHouse).channels.cache
            .get(config.ids.exchange)
            .send(`${winner.tag} wins the daily lotto: ${jackpot} GBPs!`);
    },

    assembleParty(client, config, db, channel, leader, text, wager) {
        //returns party or false if rejected

        //this is a super dumb way to force an async function
        return delayGratification();
        async function delayGratification() {
            //send invite
            const invite = await channel.send(text)
            .then(async function(msg) {
                self.react(msg, [config.ids.yeehaw, config.ids.sanic]);
                
                //anyone may join, but only party leader can start
                const inviteFilter = (reaction, user) => (user.id !== client.user.id) && (
                    (reaction.emoji.id === config.ids.yeehaw) || 
                    (reaction.emoji.id === config.ids.sanic && user.id === leader.id));
                    
                //wait 3 mins
                const inviteCollector = msg.createReactionCollector(inviteFilter, { time: 180000 });
                
                //leader closes party
                inviteCollector.on('collect', reaction => {
                    if (reaction.emoji.id === config.ids.sanic) {
                        inviteCollector.stop();
                    }
                });

                //assemble party
                return new Promise(function(resolve) {
                    inviteCollector.on('end', collected => {
                        msg.reactions.removeAll();
                        const p = collected.get(config.ids.yeehaw) ? collected.get(config.ids.yeehaw).users.cache.filter(u => !u.bot).array() : [];
                        if (!p.includes(leader)) {
                            p.push(leader);
                        }
                        resolve({ party: p, message: msg});
                    });
                });
            })
            .catch(console.error);

            //get GBP data for party members
            const data = await self.getGBPs(db, invite.party.map(p => p.id));
            if (!data.Responses || !data.Responses.GBPs) {
                invite.message.edit('No users were found.');
                return false;
            }

            //filter party to those who can meet wager
            if (wager) {
                invite.party = invite.party.filter(p => {
                    const match = data.Responses.GBPs.find(d => d.UserID === p.id);
                    if (match) {
                        return match.GBPs >= wager;
                    }
                    return false;
                });
            }
            
            if (!invite.party.length) {
                invite.message.edit('No members meet the requirements.');
                return false;
            }

            //leader will confirm start
            const edit = [];
            edit.push(`${leader.username}, react with ${client.emojis.cache.get(config.ids.yeehaw)} to start or ${client.emojis.cache.get(config.ids.baba)} to cancel.`);
            edit.push('The party includes the following members:');
            edit.push(invite.party.join(', '));

            const result = await invite.message.edit(edit)
            .then(msg => {
                self.react(msg, [config.ids.yeehaw, config.ids.baba]);
                
                //only party leader can start
                const startFilter = (reaction, user) => user.id === leader.id;
                    
                //wait 2 mins
                const startCollector = msg.createReactionCollector(startFilter, { time: 120000, max: 1 });

                //stop or go
                return new Promise(function(resolve) {
                    startCollector.on('collect', reaction => {
                        msg.reactions.removeAll();
                        
                        if (reaction.emoji.id === config.ids.yeehaw) {
                            resolve({ party: invite.party, data: data });
                        }
                        else {
                            msg.edit(msg.content + '\n\n**Party leader canceled**');
                            resolve(false);
                        }
                    });
                });
            })
            .catch(console.error);

            return result;
        }
    },

    react(message, emojis) {
        try {
            emojis.forEach(emoji => message.react(emoji));
            return true;
        }
        catch (err) {
            console.log(err);
            return false;
        }
    },

    getGBPs(db, userIDs) {
        const params = { RequestItems: { 'GBPs': { Keys: [] } }};
        userIDs.forEach(id => {
            params.RequestItems['GBPs'].Keys.push({ UserID: id });
        });

        
        return db.batchGet(params).promise();
        //returns { Responses { GBPS: [{user1}, {user2}, ...] } }
    }
};