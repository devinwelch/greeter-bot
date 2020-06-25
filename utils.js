const config = require('./config.json');
const fs = require('fs');

let self = module.exports = {
    getPopularChannel(client) {
        return client.channels.cache
            .filter(channel => channel.type === 'voice')
            .filter(channel => !channel.parent || channel.parent.id !== config.ids.foil)
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
        if (voiceChannel && !client.voice.connections.get(voiceChannel.guild.id) &&
           (!voiceChannel.parent || voiceChannel.parent.id !== config.ids.foil)) {
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

    playMe(client, voiceChannel, name, gnomed = false, noKnock = false, paws = false) {
        let path;
        
        if (gnomed &&
            voiceChannel.members.size > 1 &&
            !self.getRandom(15)) {
            path = 'gnomed.mp3';
        }
        else {
            const regex = RegExp('^' + name.toLowerCase());
            const files = fs.readdirSync('./Sounds/Friends/' + (paws ? 'Paws/' : '')).filter(file => regex.test(file));
            
            if (!files.length) {
                if (paws) {
                    self.playSong(client, voiceChannel, 'Friends/Paws/paws.mp3', noKnock);
                }

                return;
            }
            
            path = 'Friends/' + (paws ? 'Paws/' : '') + self.selectRandom(files);
        }
        
        self.playSong(client, voiceChannel, path, noKnock);
    },

    infect(client) {
        client.channels.cache.filter(channel => channel.type === 'voice').array().forEach(voiceChannel => {
            const noninfected = voiceChannel.members.filter(member => !member.roles.cache.has(config.ids.corona));
            
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

                    const botchat = client.channels.cache.get(config.ids.botchat);
                    botchat.messages.fetch({ limit: 100 })
                    .then(messages => {
                        messages.filter(msg => msg.mentions.has(victim) && msg.content.includes('Yuck, stay away'))
                        .forEach(msg => msg.delete().catch(console.error));
                    });
                    client.channels.cache.get(config.ids.botchat).send(`${victim} caught the coronavirus! Yuck, stay away!`);
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

    putData(db, user, options) {
        const params = {
            TableName: 'GBPs',
            Item: {
                UserID      : user.id || user,
                Username    : user.username.toLowerCase() || user,
                GBPs        : options.gbps || 0,
                HighScore   : options.gbps || 0,
                Stash       : 0,
                Loan        : 0,
                Inventory   : { 'fists': true, 'random': true },
                Equipped    : 'fists',
                Team        : 'none',
                Lvl         : getLvl(db.xp, options.xp || 1),
                XP          : options.xp || 0,
                Skills      : {}
            }
        };

        db.put(params, function(err) {
            if (err) {
                console.error(`Unable to add ${params.Item.Username}:`, JSON.stringify(err, null, 2));
            }
            else {
                console.log(`Added ${params.Item.Username}:`, JSON.stringify(params.Item, null, 2));
            }
        });
    },

    updateData(db, user, options) {
        //user can be a (user object) or (user id string)
        const id = user.id || user;
        const params = {
            TableName: 'GBPs',
            Key: { 'UserID': id }
        };
    
        //find user data
        db.get(params, function(err, data) {
            if (err) {
                console.error(`Error. Unable to get data for ${user.username}`);
            } 
            //user not found
            else if (!data.Item) {
                self.putData(db, user, options);
            } 
            //update existing user
            else {
                const expressions = [];
                const attributes  = {};
                const d = data.Item;

                if (options.gbps) {
                    expressions.push('GBPs = GBPs + :gbps');
                    attributes[':gbps'] = options.gbps;

                    const highscore = d.GBPs + d.Stash - (isNaN(options.loan) ? d.Loan : options.loan) + (options.stash || 0) + options.gbps;
                    if (highscore > d.HighScore) {
                        expressions.push('HighScore = :highscore');
                        attributes[':highscore'] = highscore;
                    }
                }

                if (options.stash) {
                    expressions.push('Stash = Stash + :stash');
                    attributes[':stash'] = options.stash;
                }

                if (!isNaN(options.loan)) {
                    expressions.push('Loan = :loan');
                    attributes[':loan'] = options.loan;
                }

                if (options.xp) {
                    expressions.push('XP = XP + :xp');
                    attributes[':xp'] = options.xp;

                    const lvl = getLvl(db.xp, d.XP + options.xp);
                    if (lvl > d.Lvl) {
                        expressions.push('Lvl = :lvl');
                        attributes[':lvl'] = lvl;
                        
                        //announce to the world
                        const botchat = user.client.channels.cache.get(config.ids.botchat);
                        botchat.messages.fetch({ limit: 100 })
                        .then(messages => {
                            messages.filter(msg => msg.mentions.has(user) && msg.content.includes('leveled up to'))
                            .forEach(msg => msg.delete().catch(console.error));
                        });
                        botchat.send(`${user} leveled up to ${lvl}!`);
                    }
                }

                if (options.skills) {
                    if (Object.keys(options.skills).length) {
                        Object.keys(options.skills).forEach(i => {
                            expressions.push(`Skills.${i} = :${i}`);
                            attributes[`:${i}`] = options.skills[i];
                        });
                    }
                    else {
                        expressions.push('Skills = :skills');
                        attributes[':skills'] = {};
                    }
                }

                if (options.inventory) {
                    Object.keys(options.inventory).forEach(i => {
                        expressions.push(`Inventory.${i} = :${i}`);
                        attributes[`:${i}`] = options.inventory[i];
                    });
                }

                if (options.equipped) {
                    expressions.push('Equipped = :equipped');
                    attributes[':equipped'] = options.equipped;
                }

                if (options.team) {
                    expressions.push('Team = :team');
                    attributes[':team'] = options.team;
                }

                if (user.username && user.username.toLowerCase() !== d.Username) {
                    expressions.push('Username = :username');
                    attributes[':username'] = user.username.toLowerCase();
                }

                //skip if nothing to update
                if (!Object.keys(attributes).length) {
                    return;
                }

                params.UpdateExpression = 'set ' + expressions.join(', ');
                params.ExpressionAttributeValues = attributes;

                db.update(params, function(err) {
                    if (err) {
                        console.log('Unable to update user. Error JSON:', JSON.stringify(err, null, 2));
                    }
                    else {
                        if (attributes[':xp'] >= 100 || Object.keys(attributes).some(a => a !== ':xp')) {
                            console.log(`Updated ${user.username || user}:`, JSON.stringify(attributes));
                        }
                        
                        //optional confirmation to user
                        if (options.message && options.emoji) {
                            self.react(options.message, [options.emoji]);
                        }
                    }
                });
            }
        });
    },

    getData(db, userIDs) {
        if (!Array.isArray(userIDs)) {
            userIDs = [userIDs];
        }

        const params = { RequestItems: { 'GBPs': { Keys: [] } }};
        userIDs.forEach(id => {
            params.RequestItems['GBPs'].Keys.push({ UserID: id });
        });

        return db.batchGet(params).promise();
        //returns { Responses { GBPS: [{user1}, {user2}, ...] } }
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

        //clear channel of generic anouncements
        const botchat = client.channels.cache.get(config.ids.botchat);
        const weekAgo = Date.now() - (1000 * 60 * 60 * 24 * 7); 
        botchat.messages.fetch({ limit: 100 })
        .then(messages => {
            messages.filter(msg => 
                msg.author === client.user &&
                msg.createdTimestamp < weekAgo && 
                (
                    msg.content.includes('wins the daily lotto') ||
                    msg.content.includes('Yuck, stay away') ||
                    msg.content.includes('leveled up to') ||
                    msg.content.includes('Reclaimed')
                )
            )
            .forEach(msg => msg.delete().catch(console.error));
        });
    },

    reset(client, db, data) {                    
        console.log('Resetting the economy!');
        client.channels.cache.get(config.ids.botchat).send('**From the ashes we are born anew. The GBP economy has been reset. Go forth!**');
        
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
                                const gbpParams = {
                                    TableName: 'GBPs',
                                    Key: { 'UserID': user.UserID },
                                    UpdateExpression: 'set GBPs = :z, Stash = :z, HighScore = :z, Loan = :z',
                                    ExpressionAttributeValues: { ':z': 0 }
                                };
                                db.update(gbpParams, function(err) {
                                    if (err) {
                                        console.error('Unable to zero user. Error JSON:', JSON.stringify(err, null, 2));
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
        db.scan({ TableName: 'GBPs' }, function(err, data) {
            data.Items.filter(d => d.Loan > 0).forEach(d => {
                const reclaim = Math.ceil(d.Loan * 1.1);
                
                client.users.fetch(d.UserID).then(user => {
                    self.updateData(db, user, { gbps: -reclaim, loan: 0 });
                    self.updateData(db, client.user, { gbps: reclaim });

                    client.channels.cache.get(config.ids.botchat).send(`Reclaimed ${reclaim} GBPs from ${user}`);
                });    
            });
        });
    },

    giveaway(client, db) {
        const members = client.guilds.cache.get(config.ids.hooliganHouse).members.cache;
        
        const jackpot = members.size;
        const winner = members.random(1)[0].user;
        self.updateData(db, winner, { gbps: jackpot });

        client.guilds.channels.cache.get(config.ids.botchat).send(`${winner} wins the daily lotto: ${jackpot} GBPs!`);
    },

    assembleParty(client, config, db, channel, leader, text, wager) {
        //returns party or false if rejected
        //this is a super dumb way to force an async function
        return delayGratification();
        async function delayGratification() {
            //cancel if leader can't afford wager
            if (wager) {
                const leaderGBP = await self.getData(db, leader.id);
                if (!leaderGBP.Responses || !leaderGBP.Responses.GBPs || leaderGBP.Responses.GBPs[0].GBPs < wager) {
                    channel.send(`${leader}, you can't afford that!`);
                    return false;
                } 
            }

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
                
                const party = [];

                //leader closes party
                inviteCollector.on('collect', (reaction, user) => {
                    if (reaction.emoji.id === config.ids.sanic) {
                        inviteCollector.stop();
                    }
                    else {
                        if (!party.includes(user)) {
                            party.push(user);
                        }
                    }
                });

                //assemble party
                return new Promise(function(resolve) {
                    inviteCollector.on('end', () => {
                        msg.reactions.removeAll();
                        if (!party.includes(leader)) {
                            party.push(leader);
                        }
                        resolve({ party: party, message: msg});
                    });
                });
            })
            .catch(console.error);

            //get GBP data for party members
            const data = await self.getData(db, invite.party.map(p => p.id));
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

    format(str, max) {
        str = str.toString();
        return str + ' '.repeat(Math.max(0, max - str.length));
    },

    giveXP(client, db) {
        client.channels.cache.filter(channel => channel.type === 'voice').each(channel => {
            channel.members.filter(m => !m.deaf).filter(m => !m.mute).each(m => self.updateData(db, m.user, { xp: 60 }));
        });
    },

    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = self.getRandom(i);
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }

        return arr;
    }
};

function getLvl(table, xp) {
    //level = (last index xp is greater than or equal to) + 1
    for(var x = 98; x >= 0; x--) {
        if (xp >= table[x]) {
            return x + 1;
        }
    }

    return false;
}