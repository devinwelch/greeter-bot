const { establishGBPs, updateGBPs, sleep, selectRandom, getRandom } = require('../utils.js');
const items = require('./items.json');

const self = module.exports = {
    name: 'duel',
    description: 'Duel against another player using equipped weapons. Add a wager to bet GBPs!',
    aliases: ['challenge'],
    usage: '[wager] <@user>',
    execute(client, config, db, message, args) {
        //change IDs for test server; should be commented in production
        // config.ids.yeehaw = '700795024551444661';
        // config.ids.baba   = '700795091501056111';
        // config.ids.corona = '701886367625379938';

        //input sanitization
        if (!message.mentions.members.size) {
            return message.reply('Please @ a user!');
        }
        const wager = /\d+ .+/.test(args) ? Math.floor(args.trim().split(' ', 1)[0]) : 0;
        const target = message.mentions.members.first(1)[0];
        if (target.id === client.user.id) {
            return message.reply('I will not fight you, friend.');
        }
        else if (target.id === message.author.id) {
            return message.reply('Quit playing with yourself!');
        }
        else if (wager < 0) {
            return message.reply('Make it a real challenge.');
        }

        //dynamodb does not allow OR query on primary key so have to do two separate look-ups
        //get info for challenger
        const params1 = {
            TableName: 'GBPs',
            Key: { UserID: message.author.id }
        };
        db.get(params1, function(err, data1) {
            if (err) {
                console.log(err);
            }
            else if (!data1.Item) {
                establishGBPs(db, message.author, 0);
                message.reply('Get money.');
            }
            else if (data1.Item.GBPs < wager && wager > 0) {
                message.reply(`Hang on there, slick! You only have ${data1.Item.GBPs} GBPs!`);
            }
            else {
                //get info for target
                const params2 = {
                    TableName: 'GBPs',
                    Key: { UserID: target.id }
                };
                db.get(params2, function(err, data2) {
                    if (err) {
                        console.log('Could not search GBPs');
                    }
                    else if (!data2.Item) {
                        establishGBPs(db, target.user, 0);
                        message.reply(`${target.displayName} can't match that bet!`);
                    }
                    else if (data2.Item.GBPs < wager && wager > 0) {
                        message.reply(`${target.displayName} can't match that bet!`);
                    }
                    else {
                        //send duel invite
                        message.channel.send(`${target.displayName}! ${message.member.displayName} challenges you to a duel for ${wager ? `${wager} GBPs` : 'fun'}! React here: ${client.emojis.cache.get(config.ids.yeehaw)} to accept, ${client.emojis.cache.get(config.ids.baba)} to decline.`)
                        .then(msg => { 
                            msg.react(config.ids.yeehaw);
                            msg.react(config.ids.baba);

                            //challenger and target may decline, but only target may accept
                            const filter = (reaction, user) => (reaction.emoji.id === config.ids.yeehaw && user.id === target.id) ||
                                (reaction.emoji.id === config.ids.baba && (user.id === target.id || user.id === message.author.id));
                            const collector = msg.createReactionCollector(filter, { time: 60000, max: 1 });

                            //await reaction
                            collector.on('collect', reaction => {
                                //challenger accepts
                                if (reaction.emoji.id === config.ids.yeehaw) {
                                    self.setup(config, message.member, data1, target, data2);
                                    self.start(config, db, message.channel, message.member, target, wager);
                                }
                            });
                    
                            //delete invite after accepted/rejected
                            collector.on('end', function() { 
                                msg.delete().catch(console.error); 
                            }); 
                        })
                        .catch(console.error);
                    }
                });
            }
        });
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
        if (data.Item.Equipped === 'random') {
            const inventory = Object.keys(data.Item.Inventory).filter(key => data.Item.Inventory[key] && items[key] && items[key].weapon);
            const item = items[selectRandom(inventory)];
            return item;
        }
        
        return items[data.Item.Equipped];
    },
    start(config, db, channel, challenger, target, wager) {
        //send invite acceptance and initial header
        channel.send(`${target.displayName} accepted ${challenger.displayName}'s challenge! ${wager ? wager : 'No'} GBPs are on the line.`);
        channel.send(self.getHeader(channel.guild.emojis.cache, challenger, target, 100, 100))
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
                actions = actions.concat(self.fight(config, db, m, challenger, target, wager, challengerTurn));

                //edit message to show duel log
                self.display(m, actions, challenger, target, true);
            })
            .catch(console.error);
    },
    getHeader(emojiCache, cha, tar, chaHP, tarHP) {
        const line1 = `**${cha.displayName}\tHP: ${chaHP}\t${emojiCache.get(cha.weapon.id) || cha.weapon.name}\n`;
        const line2 =   `${tar.displayName}\tHP: ${tarHP}\t${emojiCache.get(tar.weapon.id) || tar.weapon.name}**\n`;
        return line1 + line2;
    },
    display(message, actions, challenger, target, turn) {
        if (actions.length) {
            let log = message.content.split('\n').slice(2).join('\n');

            const action = actions.shift();
            log = (action.id1 === challenger.id
                ? self.getHeader(message.channel.guild.emojis.cache, challenger, target, action.hp1, action.hp2)
                : self.getHeader(message.channel.guild.emojis.cache, challenger, target, action.hp2, action.hp1))
                + log;
            
            log += `\n${'\t'.repeat(turn || action.left ? 0 : 6)}${action.text}`;
            turn ^= action.turnEnd;

            message.edit(log)
            .then(m => {
                sleep(action.turnEnd ? 1000 : 250);
                self.display(m, actions, challenger, target, turn);
            })
            .catch(console.error);
        }
    },
    fight(config, db, message, challenger, target, wager, challengerTurn) {
        let actions = [];

        //fight til death
        while(challenger.hp > 0 && target.hp > 0) {
            const turn = challengerTurn
                ? self.getTurn(config, challenger, target)
                : self.getTurn(config, target, challenger);
            actions = actions.concat(turn);
            challengerTurn = !challengerTurn;
        }

        //re-flip turn counter for clarity
        challengerTurn = !challengerTurn;
        const tie = challenger.hp <= 0 && target.hp <= 0;
        const results = (target.hp <= 0 && challengerTurn) || (target.hp <= 0 && challenger.hp > 0)
            ? self.getResults(db, challenger, target, wager, tie)
            : self.getResults(db, target, challenger, wager, tie);
        actions = actions.concat(results);

        return actions;
    },
    getTurn(config, turnPlayer, opponent) {
        //get damage action per weapon hit
        let actions = [];
        for (var i = 0; i < turnPlayer.weapon.hits; i++) {
            actions.push(self.getAction(turnPlayer, opponent));
        }

        //if player is infected append status effect results after damage
        const yuck = ['yuck!', 'eww!', 'gross!', '\\*coughs\\*'];
        if (turnPlayer.infected && !turnPlayer.cursed) {
            //take damage (applied first to help axe) 
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
    getResults(db, winner, loser, wager, tie = false) {
        const actions = [];

        //do not add execution text if curse/self-kill
        if (!loser.cursed && !loser.selfKill) {
            const winText = winner.weapon.win.replace(':w', winner.displayName).replace(':l', loser.displayName);
            actions.push(new Action(winText, winner.id, winner.hp, loser.id, loser.hp, true));
        }
        
        //award GBPs
        if (wager) {
            if (tie) {
                const tieText = 'No GBPs are awarded for a tie.';
                actions.push(new Action(tieText, winner.id, winner.hp, loser.id, loser.hp, true));
            }
            else {
                updateGBPs(db, winner.user, wager);
                updateGBPs(db, loser.user, -wager);
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