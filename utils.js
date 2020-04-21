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
                const seekRNG = Math.floor(Math.random() * 111);
                const dispatcher = connection.play('./Sounds/Sans.mp3', { seek: seekRNG });
                dispatcher.on('finish', () => {
                    voiceChannel.leave();
                });
                const lengthRNG = 1000 * (Math.floor(Math.random() * 6) + 3);
                setTimeout(() => dispatcher.end(), lengthRNG);
            }).catch(error => console.log(error));
        }
    },

    jam(client, songName) {
        if (!client.voice.connections.get('143122983974731776')) { //Hooligan house
            client.channels.cache.get('565655168876675088').join().then(connection => { //Holiday bangers
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
                    if (!noKnock && Math.floor(Math.random() * 10) === 0) {
                        self.sleep(5000);
                        const num = Math.floor(Math.random() * 3) + 1;
                        const knocker = connection.play(`./Sounds/knock'${num.toString()}.mp3`);
                        knocker.on('finish', () => {
                            voiceChannel.leave();
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
            Math.floor(Math.random() * 12) === 0) {
            path = 'gnomed.mp3';
        }
        else {
            const regex = RegExp('^' + name.toLowerCase());
            const files = fs.readdirSync('./Sounds/Friends/').filter(file => regex.test(file));
            
            if (!files.length) {
                return;
            }
            
            path = 'Friends/' + files[Math.floor(Math.random() * files.length)];
        }
        
        self.playSong(client, voiceChannel, path, noKnock);
    },

    infect(client) {
        const coronaID = '687436756559200367';
        client.channels.cache.filter(channel => channel.type === 'voice').array().forEach(voiceChannel => {
            const noninfected = voiceChannel.members.filter(member => member.roles.cache.every(role => role.id !== coronaID));
            
            if (noninfected.size) { 
                const infectedCount = voiceChannel.members.size - noninfected.size;
                const percentChances = [0, 10, 12, 15, 20, 30, 50, 75, 100];

                const chance = percentChances[Math.min(8, infectedCount)];
                const roll = Math.floor(Math.random() * 100);
        
                if (infectedCount) {
                    console.log(`Rolled ${roll} against ${chance}% odds in channel: ${voiceChannel}`);
                }
        
                if (roll < chance) {
                    const victim = noninfected.random(1)[0];
                    victim.roles.add(coronaID);
                    client.channels.cache.get('466065580252725288').send(`${victim.user.username} caught the coronavirus! Yuck, stay away!`);
                }
            }
        });
    },

    sleep(miliseconds) {
        let startTime = new Date().getTime();
        while (startTime + miliseconds >= new Date().getTime());
    },

    establishGBPs(db, user, amount) {
        const params = {
            TableName: 'GBPs',
            Item: {
                'UserID': user.id,
                'Username': user.username,
                'GBPs': amount,
                'HighScore': amount
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
                        client.channels.cache.get('697239921144103035').send(`Reclaimed ${loanAmount} GBPs from ${user.username}`);
                    }
                });
            });
        });
    }
};