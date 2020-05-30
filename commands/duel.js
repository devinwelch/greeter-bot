const { updateGBPs, delay, selectRandom, getRandom, react } = require('../utils.js');
const items = require('./items.json');

const self = module.exports = {
    name: 'duel',
    description: 'Duel against another player using equipped weapons. Add a wager to bet GBPs! Spectators can place side bets before the duel starts.',
    usage: '[wager] <@user>',
    execute(client, config, db, message, args) {
        //input sanitization
        if (!message.mentions.members.size) {
            return message.reply('Please @ a user!');
        }
        const wager = /\d+ .+/.test(args) ? Math.floor(args.trim().split(' ', 1)[0]) : 0;
        const challenger = message.member;
        const target = message.mentions.members.first();
        
        if (target.id === client.user.id) {
            //raid instead of duel if challenging greeter-bot
            return client.commands.get('raid').execute(client, config, db, message, args);
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
                self.sendInvite(client, config, db, message.channel, challenger, target, challengerData, targetData, wager);
            }
        });
    },
    sendInvite(client, config, db, channel, challenger, target, challengerData, targetData, wager) {
        const invite = [];

        invite.push(`${target.displayName}! ${challenger.displayName} challenges you to a duel for ${wager ? `**${wager} GBPs**` : 'fun'}!`);
        invite.push('Everyone else, vote who you think will win and optionally bet GBPs!');
        invite.push('↳*click on poker chips as many times as you want, as long as you can afford it*');
        invite.push('React here:');
        invite.push(`${client.emojis.cache.get(config.ids.yeehaw)}- accept duel`);
        invite.push(`${client.emojis.cache.get(config.ids.baba  )}- decline/cancel`);
        invite.push(`${client.emojis.cache.get(config.ids.sanic )}- bet on ${challenger.displayName}`);
        invite.push(`${client.emojis.cache.get(config.ids.ebola )}- bet on ${target.displayName}`);

        channel.send(invite)
        .then(msg => {
            react(msg, [config.ids.yeehaw, config.ids.baba, config.ids.sanic, config.ids.ebola]);
            
            //side bets
            const bets = { 
                wager: wager,
                sideBets: {}
            };
            bets[challenger.id] = [];
            bets[target.id] = [];
            let firstBet = true;

            //await reactions for up to 60 sec
            const filter = (reaction, user) => user.id !== client.user.id;
            const collector = msg.createReactionCollector(filter, { time: 60000 });
            const chips = [config.ids.c1, config.ids.c5, config.ids.c10, config.ids.c25, config.ids.c100, config.ids.c500, config.ids.c1000]

            collector.on('collect', (reaction, user) => {
                //challenger or target
                if (user.id === challenger.id || user.id === target.id) {
                    //target accepts
                    if (reaction.emoji.id === config.ids.yeehaw && user.id === target.id) {
                        self.cleanUpBets(client, config, db, channel, challenger, target, bets, challengerData, targetData);
                    }
                    //duel is canceled
                    else if (reaction.emoji.id === config.ids.baba) {
                        collector.stop();
                    }
                }
                //viewer bets on challenger
                else if (reaction.emoji.id === config.ids.sanic) {
                    if (!bets[challenger.id].includes(user)) {
                        bets[challenger.id].push(user);
                    }
                    if (bets[target.id].includes(user)) {
                        const i = bets[target.id].indexOf(user);
                        bets[target.id].splice(i, 1);
                    }
                    if (firstBet) {
                        firstBet = react(msg, chips);
                    }
                }
                //viewer bets on target
                else if (reaction.emoji.id === config.ids.ebola) {
                    if (!bets[target.id].includes(user)) {
                        bets[target.id].push(user);
                    }
                    if (bets[challenger.id].includes(user)) {
                        const i = bets[challenger.id].indexOf(user);
                        bets[challenger.id].splice(i, 1);
                    }
                    if (firstBet) {
                        firstBet = react(msg, chips);
                    }
                }
                //viewer adds wager to bet
                else if(/chip\d+/.test(reaction.emoji.name)) {
                    if (bets.sideBets[user.id]) {
                        bets.sideBets[user.id] += Number(reaction.emoji.name.substring(4));
                    }
                    else {
                        bets.sideBets[user.id] = Number(reaction.emoji.name.substring(4));
                    }
                }
            });
    
            //delete invite after accepted/rejected
            collector.on('end', function() {
                msg.delete().catch(console.error); 
            }); 
        })
        .catch(console.error);
    },
    cleanUpBets(client, config, db, channel, challenger, target, bets, challengerData, targetData) {
        const candt = bets[challenger.id].concat(bets[target.id]);

        if (!candt.length) {
            return self.heartOfTheCards(client, config, db, channel, challenger, target, bets, challengerData, targetData);
        }

        self.getGBPs(db, candt)
        .then(data => {
            if (data && (!data.Responses || !data.Responses.GBPs)) {
                console.log('There was an error getting GBP data for side bets: ', bets);
            }
            else {
                candt.forEach(b => {
                    if (!bets.sideBets[b.id] ||                                                      //did not include wager
                        bets.sideBets[b.id] < 0 ||                                                   //had negative wager
                        !data.Responses.GBPs.some(d => b.id === d.UserID) ||                         //does not have GBPs
                        data.Responses.GBPs.find(d => b.id === d.UserID).GBPs < bets.sideBets[b.id]) //can not afford bet
                    {
                        bets.sideBets[b.id] = 0;
                    }
                });
            }

            self.heartOfTheCards(client, config, db, channel, challenger, target, bets, challengerData, targetData);
        });
    },
    getGBPs(db, users) {
        //get data for each bet
        const params = { RequestItems: { 'GBPs': { Keys: [] } }};
        users.forEach(user => {
            params.RequestItems['GBPs'].Keys.push({ UserID: user.id });
        });

        return db.batchGet(params).promise();   
    },
    heartOfTheCards(client, config, db, channel, challenger, target, bets, data1, data2) {
        //chance to play clip at start of duel
        const voiceChannel = challenger.voice.channel;
        if (voiceChannel && voiceChannel === target.voice.channel && !client.voice.connections.get(voiceChannel.guild.id) && !getRandom(9)) {
            return voiceChannel.join().then(connection => {
                const dispatcher = connection.play('./Sounds/duel.mp3');
                dispatcher.on('finish', () => {
                    voiceChannel.leave(); 
                    self.setup(config, challenger, data1, target, data2);
                    self.start(client, config, db, channel, challenger, target, bets);
                });
            });
        }
        else {
            self.setup(config, challenger, data1, target, data2);
            self.start(client, config, db, channel, challenger, target, bets);
        }
    },
    setup(config, challenger, challengerData, target, targetData) {
        //reset initial stats so they do not persist from prior duels
        challenger.hp = 100;
        challenger.cooldown = false;
        challenger.weapon = self.getWeapon(challengerData);
        challenger.infected = challenger.roles.cache.has(config.ids.corona);
        challenger.selfKill = false;
        challenger.cursed = false;

        target.hp = 100;
        target.cooldown = false;
        target.weapon = self.getWeapon(targetData);
        target.infected = target.roles.cache.has(config.ids.corona);
        target.selfKill = false;
        target.cursed = false;

        //start 0-1 turn early for weapons with specific sequence if opponent is infected
        challenger.turn = target.user.infected ? getRandom(1) : 0;
        target.turn = challenger.user.infected ? getRandom(1) : 0;
    },
    getWeapon(data) {
        //get random inventory item if 'random' is equipped
        if (data.Equipped === 'random') {
            const inventory = Object.keys(data.Inventory).filter(key => data.Inventory[key] && items[key] && items[key].weapon);
            const item = items[selectRandom(inventory)];
            return item;
        }
        
        return items[data.Equipped];
    },
    start(client, config, db, channel, challenger, target, bets) {
        //send invite acceptance and initial header
        channel.send(`${target.displayName} accepted ${challenger.displayName}'s challenge! ${bets.wager ? bets.wager : 'No'} GBPs are on the line.`);
        channel.send(self.getHeader(client.emojis.cache, challenger, target, 100, 100))
            .then(m => {
                //faster weapon goes first, if not then random
                const challengerTurn = challenger.weapon.speed > target.weapon.speed
                    ? true
                    : challenger.weapon.speed < target.weapon.speed
                        ? false
                        : getRandom(1);

                //pre-load fight
                const initiativeText = `${challengerTurn ? challenger.displayName : target.displayName} rolled initiative.`;
                let actions = [new Action(initiativeText, challenger.id, 100, target.id, 100)];
                actions = actions.concat(self.fight(config, db, challenger, target, bets, challengerTurn));

                //edit message to show duel log
                self.display(client, m, actions, challenger, target, true);
            })
            .catch(console.error);
    },
    getHeader(emojiCache, cha, tar, chaHP, tarHP) {
        const line1 = `**${cha.displayName}\tHP: ${chaHP}\t${emojiCache.get(cha.weapon.id) || cha.weapon.name}\n`;
        const line2 =   `${tar.displayName}\tHP: ${tarHP}\t${emojiCache.get(tar.weapon.id) || tar.weapon.name}**\n`;
        return line1 + line2;
    },
    display(client, message, actions, challenger, target, turn) {
        if (actions.length) {
            let log = message.content.split('\n').slice(2).join('\n');

            const action = actions.shift();
            log = (action.id1 === challenger.id
                ? self.getHeader(client.emojis.cache, challenger, target, action.hp1, action.hp2)
                : self.getHeader(client.emojis.cache, challenger, target, action.hp2, action.hp1))
                + log;
            
            log += `\n${'\t'.repeat(turn || action.left ? 0 : 6)}${action.text}`;
            turn ^= action.turnEnd;

            message.edit(log)
            .then(m => {
                delay(action.turnEnd ? 1500 : 750).then(() => {
                    self.display(client, m, actions, challenger, target, turn);
                });
            })
            .catch(console.error);
        }
    },
    fight(config, db, challenger, target, bets, challengerTurn) {
        let actions = [];

        //easter egg
        const wayOfVikings = challenger.weapon.steel && target.weapon.steel && !getRandom(19);

        if (wayOfVikings) {
            actions.push(new Action('Sparks fly high when steel meets steel', challenger.id, challenger.hp, target.id, target.hp));
            actions.push(new Action('And no one can believe', challenger.id, challenger.hp, target.id, target.hp));
            actions.push(new Action('That these two men are best friends', challenger.id, challenger.hp, target.id, target.hp));
            actions.push(new Action('Not enemies!', challenger.id, challenger.hp, target.id, target.hp, true));
        }

        //fight til death
        while(challenger.hp > 0 && target.hp > 0) {
            const turn = challengerTurn
                ? self.getTurn(config, challenger, target)
                : self.getTurn(config, target, challenger);
            actions = actions.concat(turn);
            challengerTurn = !challengerTurn;
        }

        if (wayOfVikings) {
            actions.push(new Action('In this fight of iron wills', challenger.id, challenger.hp, target.id, target.hp));
            actions.push(new Action('One man takes a knee', challenger.id, challenger.hp, target.id, target.hp));
            actions.push(new Action('The other goes for the kill', challenger.id, challenger.hp, target.id, target.hp));
            actions.push(new Action('Like an enemy!', challenger.id, challenger.hp, target.id, target.hp, true));
        }

        //re-flip turn counter for clarity
        challengerTurn = !challengerTurn;
        const tie = challenger.hp <= 0 && target.hp <= 0;
        const results = (target.hp <= 0 && challengerTurn) || (target.hp <= 0 && challenger.hp > 0)
            ? self.getResults(db, challenger, target, bets, tie)
            : self.getResults(db, target, challenger, bets, tie);
        actions = actions.concat(results);

        return actions;
    },
    getTurn(config, turnPlayer, opponent) {
        let actions = [];

        //get damage action per weapon hit
        for (var i = 0; i < turnPlayer.weapon.hits; i++) {
            actions.push(self.getAction(turnPlayer, opponent));
        }

        //if player is infected append status effect results after damage
        const yuck = ['yuck!', 'eww!', 'gross!', '\\*coughs\\*'];
        if (turnPlayer.infected && !turnPlayer.cursed) {
            const coronaDamage = getRandom(1, 2);
            turnPlayer.hp -= coronaDamage;
            turnPlayer.selfKill = turnPlayer.hp <= 0;
            const coronaText = `*...and ${turnPlayer.selfKill ? 'died' : `lost **${coronaDamage}** hp`} to corona*`;
            actions.push(new Action(coronaText, turnPlayer.id, turnPlayer.hp, opponent.id, opponent.hp));

            //5% chance to infect opponent
            if (!getRandom(19) && !opponent.infected) {
                opponent.roles.add(config.ids.corona);
                opponent.infected = true;
                const infectText = `${opponent.displayName} **caught corona, ${selectRandom(yuck)}**`;
                actions.push(new Action(infectText, turnPlayer.id, turnPlayer.hp, opponent.id, opponent.hp));
            }
        }

        actions[actions.length - 1].turnEnd = true;
        return actions;
    },
    getAction(turnPlayer, opponent) {
        const weapon = turnPlayer.weapon;
        let text;

        //skeleton for sequence-style weapons, but just kamehameha for now
        if (weapon.sequence) {
            if (turnPlayer.turn === weapon.sequence.length - 1) {
                opponent.hp = 0;
            }
            text = turnPlayer.displayName + weapon.sequence[turnPlayer.turn];
            turnPlayer.turn++;
        }
        //7% chance to insta-kill for scythes
        else if (weapon.insta && getRandom(99) < 7) {
            if (weapon.cursed) {
                text = `${turnPlayer.displayName} is just another victim of the bad girl's curse!`;
                turnPlayer.cursed = true;
                turnPlayer.hp = 0;
            }
            else {
                text = `${turnPlayer.displayName} called upon dark magicks!`;
                opponent.hp = 0;
            }
        }
        else {
            if (turnPlayer.cooldown) {
                text = `${turnPlayer.displayName} is winding up...`;
            }
            else {
                let dmg = getRandom(weapon.low, weapon.high);
                if (weapon.zerk) {
                    dmg += Math.ceil(dmg * (100 - turnPlayer.hp) / 101);

                    //required to balance axe v. ka matchup
                    if (opponent.weapon.name === 'kamehameha') {
                        dmg += 4;
                    }
                }
                text = `${turnPlayer.displayName} hit for **${dmg}** dmg!`;
                opponent.hp -= dmg;
            }

            //slow weapons pause between turns
            if (weapon.speed < 0) {
                turnPlayer.cooldown = !turnPlayer.cooldown;
            }
        }

        return new Action(text, turnPlayer.id, turnPlayer.hp, opponent.id, opponent.hp);
    },
    getResults(db, winner, loser, bets, tie = false) {
        let actions = [];

        //do not add execution text if curse/self-kill
        if (!loser.cursed && !loser.selfKill) {
            const winText = winner.weapon.win.replace(':w', winner.displayName).replace(':l', loser.displayName);
            actions.push(new Action(winText, winner.id, winner.hp, loser.id, loser.hp, true));
        }

        //tie
        if (tie) {
            let tieText = "\nIt's a tie...";
            if (bets.wager || Object.keys(bets.sideBets).length) {
                tieText += ' No GBPs are awarded.';
            }
            actions.push(new Action(tieText, winner.id, winner.hp, loser.id, loser.hp, true));
        }
        //award GBPs
        else {
            if (bets.wager) {
                updateGBPs(db, winner.user, bets.wager);
                updateGBPs(db, loser.user, -bets.wager);
            }

            if (bets[winner.id].length) {
                const wins = [];
                bets[winner.id].forEach(w => {
                    if (bets.sideBets[w.id]) {
                        updateGBPs(db, w, bets.sideBets[w.id]);
                    }
                    wins.push(`**${w.username}** *(${bets.sideBets[w.id]})*`);
                });
                actions.push(new Action(`\nSide bet winners: ${wins.join(', ')}`, winner.id, winner.hp, loser.id, loser.hp, true));
            }

            if (bets[loser.id].length) {
                const losses = [];
                bets[loser.id].forEach(l => {
                    if (bets.sideBets[l.id]) {
                        updateGBPs(db, l, -bets.sideBets[l.id]);
                    }
                    losses.push(`**${l.username}** *(${bets.sideBets[l.id]})*`);
                });
                actions.push(new Action(`Side bet losers: ${losses.join(', ')}`, winner.id, winner.hp, loser.id, loser.hp, true));
            }
        }

        return actions;
    }
};

class Action { //lawsuit
    constructor(text, id1, hp1, id2, hp2, left = false) {
        this.text = text;

        this.id1 = id1;
        this.hp1 = hp1;

        this.id2 = id2;
        this.hp2 = hp2;

        this.left = left;
    }
}