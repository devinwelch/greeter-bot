const { Weapon } = require('./rpg/classes/weapon');
const { Item } = require('./rpg/classes/item');
const { v4: uuidv4 } = require('uuid');
const ytdl = require('ytdl-core');
const items = require('./rpg/items.json');
const config = require('./config.json');
const fs = require('fs');

const self = module.exports = {
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

    playSong(client, voiceChannel, song, noKnock) {
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

    playMe(client, voiceChannel, name, options = {}) {
        let path;
        
        if (options.gnomed && voiceChannel.members.size > 1 && self.getChance(5)) {
            path = 'gnomed.mp3';
        }
        else if (options.chud) {
            path = 'Friends/chud5.mp3';
        }
        else {
            const regex = RegExp('^' + name.toLowerCase());
            const files = fs.readdirSync('./Sounds/Friends/').filter(file => regex.test(file));
            
            if (!files.length) {
                return;
            }
            
            path = 'Friends/' + self.selectRandom(files);
        }
        
        self.playSong(client, voiceChannel, path, options.noKnock);
    },

    playYouTube(client, voiceChannel, url, options) {
        const streamOptions = {
            seek: options.seek || 0,
            volume: options.volume || 0.4
        };

        if (voiceChannel && 
            ytdl.validateURL(url) && 
            !client.voice.connections.get(voiceChannel.guild.id) &&
            (!voiceChannel.parent || voiceChannel.parent.id !== config.ids.foil))
        {
            voiceChannel.join()
            .then(async function(connection) {
                const dispatcher = connection.play(ytdl(url), streamOptions);
                dispatcher.on('start', () => {
                    if (options.timeout) {
                        setTimeout(() => dispatcher.end(), options.timeout);
                    }
                });
                dispatcher.on('finish', () => {
                    voiceChannel.leave();
                });
            })
            .catch(console.error);
        }
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
                    if (config.ids.immune.includes(victim.id)) {
                        return;
                    }
                    
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

    selectRandom(array, amount) {
        if (!amount) {
            return array[Math.floor(Math.random() * array.length)];
        }

        if (amount > array.length) {
            return false;
        }
        
        const selected = [];
        const arr = Array.from(array);
        
        for(let i = 0; i < amount; i++) {
            const selection = self.getRandom(arr.length - 1);
            selected.push(arr[selection]);
            arr.splice(selection, 1);
        }

        return selected;
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

    getChance(percent) {
        //works to 2 decimal places
        return self.getRandom(1, 10000) <= percent * 100;
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
                Coins       : options.coins || 0,
                Boxes       : 0,
                Inventory   : [self.generateWeapon(1, { type: 'fists', chances: [1, 0, 0, 0], plain: true })],
                Equipped    : 0,
                Team        : 'none',
                Lvl         : getLvl(db.xp, options.xp || 1),
                XP          : options.xp || 0,
                Skills      : {},
                Faith       : 0
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

                if (options.coins) {
                    expressions.push('Coins = Coins + :coins');
                    attributes[':coins'] = options.coins;
                }

                if (options.boxes) {
                    expressions.push('Boxes = Boxes + :boxes');
                    attributes[':boxes'] = options.boxes;
                }

                if (options.xp) {
                    expressions.push('XP = XP + :xp');
                    attributes[':xp'] = options.xp;

                    const lvl = getLvl(db.xp, d.XP + options.xp);
                    if (lvl > d.Lvl) {
                        expressions.push('Lvl = :lvl');
                        attributes[':lvl'] = lvl;

                        expressions.push('Inventory[0] = :fists');
                        attributes[':fists'] = self.generateWeapon(lvl, { type: 'fists', chances: [1, 0, 0, 0], plain: true });
                        
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
                    if (!Array.isArray(options.inventory)) {
                        options.inventory = [options.inventory];
                    }
                    if (options.inventory.length) {
                        expressions.push('Inventory = list_append(Inventory, :inventory)');
                        attributes[':inventory'] = options.inventory;
                    }
                }

                if (!isNaN(options.equipped) && options.equipped !== d.Equipped) {
                    expressions.push('Equipped = :equipped');
                    attributes[':equipped'] = options.equipped;
                }

                if (options.reequip) {
                    if (d.Equipped === options.reequip) {
                        expressions.push('Equipped = :equipped');
                        attributes[':equipped'] = 0;
                    }
                    else if (d.Equipped > options.reequip) {
                        expressions.push('Equipped = Equipped + :reequip');
                        attributes[':reequip'] = -1;
                    }
                }

                if (options.team) {
                    expressions.push('Team = :team');
                    attributes[':team'] = options.team;
                }

                if (options.faith) {
                    expressions.push('Faith = Faith + :faith');
                    attributes[':faith'] = options.faith;
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
                    else if (options.message && options.emoji) {
                        self.react(options.message, options.emoji);
                    }
                });
            }
        });
    },

    getData(db, userIDs) {
        if (!Array.isArray(userIDs)) {
            userIDs = [userIDs];
        }

        const params = { RequestItems: { 'GBPs': { Keys: userIDs.map(id => { return { UserID : id }; }) } }};

        return db.batchGet(params).promise();
        //returns { Responses { GBPS: [{user1}, {user2}, ...] } }
    },

    getRanks: async function(db, includeRobots) {
        let coinData = await self.getCoinData(db);
        if (!coinData) {
            return null;
        }
        coinData = coinData[coinData.length - 1];

        let gbpData = await db.scan({ TableName: 'GBPs' }).promise();
        if (!gbpData || !gbpData.Items || !gbpData.Items.length) {
            return null;
        }

        gbpData = gbpData.Items.map(user => {
            const items = user.Inventory.slice(1).reduce((a, b) => {
                const item = b.weapon ? new Weapon(b) : new Item(b);
                return a + item.sell();
            }, 0);

            const coins = user.Coins * coinData;

            return {
                Username: user.Username,
                UserID: user.UserID,
                HighScore: user.HighScore,
                Worth: user.GBPs + user.Stash - user.Loan + coins + items
            };
        });

        gbpData.sort((a, b) => b.Worth - a.Worth);
        if (!includeRobots) {
            gbpData = gbpData.filter(user => user.Username !== 'greeter-bot');
        }

        return gbpData;
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
                                    UpdateExpression: 'set GBPs = :z, Stash = :z, HighScore = :z, Loan = :z, Coins = :z',
                                    ExpressionAttributeValues: { ':z': 0 }
                                };
                                db.update(gbpParams, function(err) {
                                    if (err) {
                                        console.error('Unable to zero user. Error JSON:', JSON.stringify(err, null, 2));
                                    }
                                });
                            });

                            const coinParams = { 
                                TableName: 'Coin', 
                                Key: { Key: 0 },
                                UpdateExpression: 'set #v = :v',
                                ExpressionAttributeNames: { '#v': 'Values' },
                                ExpressionAttributeValues: { ':v': [100, 100] }
                            };

                            db.update(coinParams, function(err) {
                                if (err) {
                                    console.error('Unable to update coin. Error JSON:', JSON.stringify(err, null, 2));
                                }
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
        
        const jackpot = members.size * 3;
        const winner = members.random(1)[0].user;
        self.updateData(db, winner, { gbps: jackpot });

        client.channels.cache.get(config.ids.botchat).send(`${winner} wins the daily lotto: ${jackpot} GBPs!`);
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
                            resolve({ party: invite.party, data: data, msg: msg });
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
            if (!Array.isArray(emojis)) {
                emojis = [emojis];
            }
            emojis.forEach(emoji => {
                const reaction = message.reactions.cache.find(reaction => reaction.emoji.id === emoji || reaction.emoji.name === emoji);
                if (!reaction || !reaction.users.cache.has(reaction.client.user.id)) {
                    message.react(emoji);
                }
            });
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
    },

    getCoinData: async function(db) {
        const data = await db.get({ TableName: 'Coin', Key: { Key: 0 }}).promise();
        if (!data || !data.Item) {
            return null;
        }

        return data.Item.Values;
    },

    wsb: async function(db) {
        const data = await self.getCoinData(db);
        if (!data) {
            return;
        }

        const current = data[data.length - 1];
        const iterations = 3, divider = 3;
        let delta = 0;


        for (let i = 0; i < iterations; i++) {
            delta += self.getRandom(-19 * divider, 20 * divider);
        }

        delta = 1 + delta / divider / iterations / 100;

        data.push(Math.ceil(current * delta));

        const params = {
            TableName: 'Coin',
            Key: { Key: 0 },
            UpdateExpression: 'set #v = :d',
            ExpressionAttributeNames: { '#v': 'Values' },
            ExpressionAttributeValues: { ':d': data }
        };

        db.update(params, function(err) {
            if (err) {
                console.log('Unable to update coin. Error:', JSON.stringify(err, null, 2));
            }
            else {
                console.log(`Coin value change: ${(100 * (delta - 1)).toFixed(2)}%`);
            }
        });
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

self.generateWeapon = function(lvl, options) {
    options = options || {};

    //generate uuid
    const id = options.id || uuidv4();

    //determine rarity
    const chances = options.chances || [75, 17, 7, 1];
    const roll = self.getRandom(chances.reduce((a, b) => a + b) - 1);
    const rarity = 
        roll < chances[0] ? 0 :
        roll < chances[0] + chances[1] ? 1 :
        roll < chances[0] + chances[1] + chances[2] ? 2 : 3;

    //do not award comon fists (randomly)
    let weapons = Object.values(items).filter(item => item.weapon && !item.cursed);
    if (!rarity) {
        weapons = weapons.filter(w => w.type !== 'fists');
    }

    const w = options.type
        ? items[options.type] 
        : self.selectRandom(weapons);

    const weapon = new Weapon({
        rarity:         rarity,
        id:             id,

        type:           w.type,
        name:           w.name,
        icon:           w.icons[rarity],
        description:    w.description,
        win:            w.win,

        low:            w.low,
        high:           w.high,
        priority:       w.priority,
        hits:           w.hits,
        steel:          w.steel,

        spidermin:      w.spidermin,
        spidermax:      w.spidermax,
        zerk:           w.zerk,
        instakill:      w.instakill,
        sequence:       w.sequence,
        slow:           w.slow
    });

    //get random bonuses for rare+
    if (weapon.rarity) {
        const stats = self.shuffle(['dmg', 'speed', 'reaction', 'hp', 'insta', 'priority']);
        const bonuses = {};

        stats.forEach(stat => bonuses[stat] = 0);

        let points = self.getRandom(10, 20);
        let s = 0;
        
        while (points > 0 && s < stats.length) {
            switch(stats[s]) {
                case 'dmg':
                    bonuses.dmg = getWeaponBonus(1, 5, 2, points);
                    if (!bonuses.dmg) break;
                    points -= 2 * bonuses.dmg;
                    weapon.low *= 1 + bonuses.dmg / 100;
                    weapon.high *= 1 + bonuses.dmg / 100;
                    weapon.bonuses.push(`+${bonuses.dmg}% dmg`);
                    break;
                case 'speed':
                    bonuses.speed = getWeaponBonus(1, 5, 1, points);
                    if (!bonuses.speed) break;
                    points -= bonuses.speed;
                    weapon.speed = 5 * bonuses.speed;
                    weapon.bonuses.push(`+${5 * bonuses.speed} speed`);
                    break;
                case 'reaction':
                    bonuses.reaction = getWeaponBonus(1, 4, 1, points);
                    if (!bonuses.reaction) break;
                    points -= bonuses.reaction;
                    weapon.reaction = 1500 + 250 * bonuses.reaction;
                    weapon.bonuses.push(`+${bonuses.reaction === 4 ? '1s' : 250 * bonuses.reaction + 'ms'} reaction time`);
                    break;
                case 'hp':
                    bonuses.hp = getWeaponBonus(1, 3, 5, points);
                    if (!bonuses.hp) break;
                    points -= 5 * bonuses.hp;
                    weapon.hpRegen = bonuses.hp;
                    weapon.bonuses.push(`+${bonuses.hp} hp regen`);
                    break;
                case 'insta':
                    bonuses.insta = getWeaponBonus(1, 2, 10, points);
                    if (!bonuses.insta || weapon.sequence) break;
                    points -= 10 * bonuses.insta;
                    weapon.instakill += bonuses.insta;
                    weapon.bonuses.push(`+${bonuses.insta}% instakill chance`);
                    break;
                case 'priority':
                    bonuses.priority = getWeaponBonus(1, 2, 10, points);
                    if (!bonuses.priority) break;
                    points -= 10 * bonuses.priority;
                    weapon.priority += bonuses.priority / 2;
                    weapon.bonuses.push(`+${bonuses.priority / 2} priority`);
                    break;
            }

            s++;
        }
    }
    //common, stat modified (use 'plain' to force no modifiers)
    else if (!options.plain && self.getRandom(1)) {
        //light weapon
        if (self.getRandom(1)) {
            weapon.low *= .97;
            weapon.high *= .97;
            weapon.reaction = 2000;
            weapon.speed = 20;

            weapon.bonuses = ['-3% dmg', '+10 speed', '+500ms reaction time'];
        }
        //heavy weapon
        else {
            weapon.low *= 1.05;
            weapon.high *= 1.05;
            weapon.speed = -20;

            weapon.bonuses = ['+5% dmg', '-20 speed'];
        }
    }

    weapon.lvl = Math.round(0.9 * lvl);
    const bonus = self.getBonus(lvl);
    weapon.low *= bonus;
    weapon.high *= bonus;

    return weapon;

    function getWeaponBonus(min, max, weight, available) {
        const roll = self.getRandom(min, max);
        for(let i = roll; i >= 0; i--) {
            if (i * weight <= available) {
                return i;
            }
        }
    }
};

self.getOrder = function(party) {
    //get different weapon priorities
    const priorities = [...new Set(party.map(fighter => fighter.weapon.priority))];
    let order = [];

    //randomize order of player per different weapon speed
    priorities.sort((a, b) => b - a).forEach(p => {
        const players = party.filter(user => user.weapon.priority === p);
        order = order.concat(self.shuffleFighters(players));
    });

    //assign turns
    for(let i = 0; i < order.length; i++) {
        order[i].position = i;
    }
    
    return order;
};

self.shuffleFighters = function(party) {
    let order = [];
    
    while(party.length) {
        //1-total, defines fighter's speed = 15 + weapon.speed
        const roll = self.getRandom(1, party.map(fighter => fighter.weapon.speed + 20).reduce((a, b) => a + b));
        let sum = 0;

        for(let i = 0; i < party.length; i++) {
            sum += party[i].weapon.speed + 20;
            if (roll <= sum) {
                order = order.concat(party.splice(i, 1));
                break;
            }
        }
    }

    return order;
};

self.addToInventory = async function(client, db, user, item) {
    let data = await self.getData(db, user.id);
    if (!data.Responses || !data.Responses.GBPs || !data.Responses.GBPs.length) {
        return;
    }

    if (!item.weapon) {
        item = new Item(item);
    }

    data = data.Responses.GBPs[0];
    if (data.Inventory.length > 10 + 5 * (data.Skills.backpack || 0)) {
        self.addToBuybacks(client, user, item);
        self.updateData(db, user, { gbps: item.sell() });
        return true;
    }
    else {
        self.updateData(db, user, { inventory: item });
        return false;
    }
};

self.addToBuybacks = async function(client, user, item) {
    if (client.buybacks[user.id]) {
        client.buybacks[user.id].push(item);
    }
    else {
        client.buybacks[user.id] = [item];
    }
};

//determine multiplier based on fighter's level
self.getBonus = function(lvl) {
    return (1 + (lvl === 99 ? 100 : lvl - 1) / 100) ** 2; 
};

self.need = async function(client, db, party, channel, options) {
    const users = party.filter(f => f.human).map(h => h.member.user);
    let item;
    let text;

    const need = new Set();
    const greed = new Set();
    const pass = new Set();

    if (options.pick) {
        item = { type: 'pick', id: uuidv4() };
        text = 'The Pick of Destiny';
    }
    else {
        item = self.generateWeapon(1, options);
        text = `A${item.rarity === 2 ? 'n' : ''} ${item.getRarity()} ${item.name}`;
    }

    if (users.length === 1) {
        channel.send(`You found ${text}!`);
        return self.addToInventory(client, db, users[0], item);
    }

    text += ' dropped! Roll for it:\t🎲 Need\t💰 Greed\t🚫 Pass';
    const message = await channel.send(text);

    self.react(message, ['🎲', '💰', '🚫']);
    const filter = (reaction, user) => users.includes(user);
    const collector = message.createReactionCollector(filter, { time: 30000 });
    
    collector.on('collect', (reaction, user) => {
        reaction.users.remove(user);

        switch (reaction.emoji.name) {
            case '🎲':
                need.add(user);
                break;
            case '💰':
                greed.add(user);
                break;
            case '🚫':
                pass.add(user);
                break;
            default:
                break;
        }

        if ((new Set([...need, ...greed, ...pass])).size === users.length) {
            collector.stop();
        }
    });

    collector.on('end', () => {
        let arr =
            need.size ? need :
            greed.size ? greed :
            pass.size ? pass : users;

        const winner = self.selectRandom(Array.from(arr));

        if (item.weapon) {
            const options = { type: item.type, chances: [0, 0, 0, 0] };
            options.chances[item.rarity] = 1;
            item = self.generateWeapon(party.find(fighter => fighter.member.id === winner.id).lvl || 1, options);
        }

        self.addToInventory(client, db, winner, item);
        channel.send(`${winner.username} wins!`);
    });
};