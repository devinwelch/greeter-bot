const { establishGBPs, updateGBPs, sleep } = require('../utils.js');
const items = require('./items.json');

const self = module.exports = {
    name: 'duel',
    description: 'Duel against another player using equipped weapons. Add a wager to bet GBPs!',
    aliases: ['challenge'],
    usage: '[wager] <@user>',
    execute(client, config, db, message, args) {
        //config.ids.yeehaw = '700795024551444661'; //testing only
        //config.ids.baba = '700795091501056111';

        if (!message.mentions.members.size) {
            message.reply('Please @ a user!');
        }

        const wager = /\d+ .+/.test(args) ? Math.floor(args.trim().split(' ', 1)[0]) : 0;
        const target = message.mentions.members.first(1)[0].user;

        if (wager < 0) {
            return message.reply('Make it a real challenge.');
        }
        else if (target.id === message.author.id) {
            return message.reply('Quit playing with yourself!');
        }

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
                const params2 = {
                    TableName: 'GBPs',
                    Key: { UserID: target.id }
                };
        
                db.get(params2, function(err, data2) {
                    if (err) {
                        console.log('Could not search GBPs');
                    }
                    else if (!data2.Item) {
                        establishGBPs(db, target, 0);
                        message.reply(`${target.username} can't match that bet!`);
                    }
                    else if (data2.Item.GBPs < wager && wager > 0) {
                        message.reply(`${target.username} can't match that bet!`);
                    }
                    else {
                        message.channel.send(`${target.username}! ${message.author.username} challenges you to a duel for ${wager ? `${wager} GBPs` : 'fun'}! React here: ${client.emojis.cache.get(config.ids.yeehaw)} to accept, ${client.emojis.cache.get(config.ids.baba)} to decline.`)
                        .then(msg => { 
                            msg.react(config.ids.yeehaw);
                            msg.react(config.ids.baba);

                            const filter = (reaction, user) => (reaction.emoji.id === config.ids.yeehaw && user.id === target.id) ||
                                (reaction.emoji.id === config.ids.baba && (user.id === target.id || user.id === message.author.id));

                            const collector = msg.createReactionCollector(filter, { time: 60000, max: 1 });

                            collector.on('collect', reaction => {
                                if (reaction.emoji.id === config.ids.yeehaw) {
                                    message.author.hp = 100;
                                    message.author.weapon = self.getWeapon(data1);
                                    message.author.cooldown = false;
                                    message.author.turn = 0;

                                    target.hp = 100;
                                    target.weapon = self.getWeapon(data2);
                                    target.cooldown = false;
                                    target.turn = 0;

                                    self.duel(db, message.channel, message.author, target, wager);
                                }
                                else {
                                    collector.stop();
                                }
                            });
                    
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
    getWeapon(data) {
        if (data.Item.Equipped === 'random') {
            const inventory = Object.keys(data.Item.Inventory).filter(key => data.Item.Inventory[key] && items[key] && items[key].weapon);
            return items[inventory[Math.floor(Math.random() * inventory.length)]];
        }
        
        return items[data.Item.Equipped];
    },
    duel(db, channel, challenger, target, wager) {
        channel.send(`${target.username} accepted ${challenger.username}'s challenge! ${wager ? wager : 'No'} GBPs are on the line.\n`);
        channel.send(`**${challenger.username}\tHP: ${challenger.hp}\t${channel.guild.emojis.cache.get(challenger.weapon.id)}\n${target.username}\tHP: ${target.hp}\t${channel.guild.emojis.cache.get(target.weapon.id)}**`)
        .then(m => {
            //faster weapon goes first, if not then 50/50 random
            const challengerTurn = challenger.weapon.speed > target.weapon.speed
                ? true
                : challenger.weapon.speed < target.weapon.speed
                    ? false
                    : Math.floor(Math.random() * 2) < 1;

            m.content += `\n${challengerTurn ? challenger.username : target.username} rolled initiative.`;
            m.edit(m.content)
            .then(self.fight(db, m, challenger, target, wager, challengerTurn))
            .catch(console.error);
        });
    },
    fight(db, message, challenger, target, wager, challengerTurn) {
        if (challenger.hp < 1) {
            return self.getResults(db, target, challenger, wager, message);
        }
        else if (target.hp < 1) {
            return self.getResults(db, challenger, target, wager, message);
        }

        sleep(1500);

        const cPrev = challenger.hp;
        const tPrev = target.hp;
        let turn = challengerTurn ? self.getTurn(challenger, target) : self.getTurn(target, challenger);
        challengerTurn = !challengerTurn;

        message.edit(
            message.content
                .replace(`${challenger.username}\tHP: ${cPrev}`,`${challenger.username}\tHP: ${challenger.hp}`)
                .replace(`${target.username}\tHP: ${tPrev}`,`${target.username}\tHP: ${target.hp}`)
            + turn)
        .then(m => self.fight(db, m, challenger, target, wager, challengerTurn));
    },
    getTurn(turnPlayer, opponent) {
        let actions = '';
        for (var i = 0; i < turnPlayer.weapon.hits; i++) {
            actions += this.getAction(turnPlayer, opponent);
        }

        return actions;
    },
    getAction(turnPlayer, opponent) {
        const weapon = turnPlayer.weapon;
        let action;

        if (weapon.sequence) {
            if (turnPlayer.turn === weapon.sequence.length - 1) {
                opponent.hp = 0;
            }
            action = `\n${turnPlayer.username}${weapon.sequence[turnPlayer.turn]}`;
            turnPlayer.turn++;
        }
        else if (weapon.insta && Math.floor(Math.random() * 100) < 7) { //7% chance of insta-kill
            if (weapon.cursed) {
                action = `\n${turnPlayer.username} is just another victim of the bad girl's curse!`;
                turnPlayer.hp = 0;
            }
            else {
                action = `\n${turnPlayer.username} harvested ${opponent.username}'s soul!`;
                opponent.hp = 0;
            }
        }
        else {
            if (turnPlayer.cooldown) {
                action = `\n${turnPlayer.username} is winding up...`;
            }
            else {
                let dmg = Math.floor(Math.random() * (weapon.high + 1 - weapon.low)) + weapon.low;
                if (weapon.zerk) {
                    dmg += Math.ceil(dmg * (100 - turnPlayer.hp) / 101);
                    if (opponent.weapon.name === 'kamehameha') {
                        dmg += 4;
                    }
                }
                action = `\n${turnPlayer.username} hit for ${dmg} dmg!`;
                opponent.hp -= dmg;
            }

            if (weapon.speed < 0) {
                turnPlayer.cooldown = !turnPlayer.cooldown;
            }
        }

        return action;
    },
    getResults(db, winner, loser, wager, message) {
        if (wager) {
            updateGBPs(db, winner, wager);
            updateGBPs(db, loser, -wager);
        }
        return message.edit(message.content + `\n${winner.username} has slain ${loser.username}!`);
    }
};