const { establishGBPs, updateGBPs, sleep } = require('../utils.js');
const items = require('./items.json');

const self = module.exports = {
    name: 'duel',
    description: 'Wager GBPs against another member in an epic battle! (invitation times out after 1 minute)',
    aliases: ['challenge'],
    usage: '<wager> <@user>',
    execute(client, config, db, message, args) {
        //config.ids.yeehaw = '700795024551444661'; //testing only
        //config.ids.baba = '700795091501056111';

        if (!/\d+ .+/.test(args) || !message.mentions.members.size) {
            return message.reply(`Please use the format: \`${config.prefix}${this.name} \`${this.usage}`);
        }

        const wager = Math.floor(args.trim().split(' ', 1)[0]);
        const target = message.mentions.members.first(1)[0].user;

        if (wager < 1) {
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
            else if (data1.Item.GBPs < wager) {
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
                    else if (data2.Item.GBPs < wager) {
                        message.reply(`${target.username} can't match that bet!`);
                    }
                    else {
                        message.channel.send(`${target.username}! ${message.author.username} challenges you to a duel for ${wager} GBPs! React here: ${client.emojis.cache.get(config.ids.yeehaw)} to accept, ${client.emojis.cache.get(config.ids.baba)} to decline.`)
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

                                    target.hp = 100;
                                    target.weapon = self.getWeapon(data2);
                                    target.cooldown = false;

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
            const inventory = Object.keys(data.Item.Inventory).filter(key => data.Item.Inventory[key] &&items[key] && items[key].weapon);
            return items[inventory[Math.floor(Math.random() * inventory.length)]];
        }
        
        return items[data.Item.Equipped];
    },
    duel(db, channel, challenger, target, wager) {
        channel.send(`${target.username} accepted ${challenger.username}'s challenge! ${wager} GBPs are on the line.\n`);
        channel.send(`**${challenger.username}\tHP: ${challenger.hp}\t${channel.guild.emojis.cache.find(e => e.name === challenger.weapon.name)}\n${target.username}\tHP: ${target.hp}\t${channel.guild.emojis.cache.find(e => e.name === target.weapon.name)}**`)
        .then(m => {
            //faster weapon goes first, if not then 50/50 random
            const challengerTurn = challenger.weapon.speed > target.weapon.speed
                ? true
                : challenger.weapon.speed < target.weapon.speed
                    ? false
                    : Math.floor(Math.random() * 2) < 1;

            m.edit(m.content)
            .then(self.fight(db, m, challenger, target, wager, challengerTurn))
            .catch(console.error);
        });
    },
    fight(db, message, challenger, target, wager, challengerTurn) {
        if (challenger.hp === 100 && target.hp === 100) {
            message.content += `\n${challengerTurn ? challenger.username : target.username} rolled initiative.`;
        }
        else if (challenger.hp < 1) {
            message.edit(message.content + `\n${target.username} has slain ${challenger.username}!`);
            updateGBPs(db, challenger, -wager);
            updateGBPs(db, target, wager);
            return;
        }
        else if (target.hp < 1) {
            message.edit(message.content + `\n${challenger.username} has slain ${target.username}!`);
            updateGBPs(db, challenger, wager);
            updateGBPs(db, target, -wager);
            return;
        }

        sleep(2000);

        const cPrev = challenger.hp;
        const tPrev = target.hp;
        let move = '';

        if (challengerTurn) {
            for (var i = 0; i < challenger.weapon.hits; i++) {
                const hit = self.getDamage(challenger, challenger.weapon);
                if (!hit) {
                    move = `\n${challenger.username} is winding up...`;
                    break;
                }
                target.hp -= hit;
                move += `\n${challenger.username} hit for ${hit} dmg!`;
            }
        }
        else {
            for (var j = 0; j < target.weapon.hits; j++) {
                const hit = self.getDamage(target, target.weapon);
                if (!hit) {
                    move = `\n${target.username} is winding up...`;
                    break;
                }
                challenger.hp -= hit;
                move += `\n${target.username} hit for ${hit} dmg!`;
            }
        }
        challengerTurn = !challengerTurn;

        message.edit(
            message.content
                .replace(`${challenger.username}\tHP: ${cPrev}`,`${challenger.username}\tHP: ${challenger.hp}`)
                .replace(`${target.username}\tHP: ${tPrev}`,`${target.username}\tHP: ${target.hp}`)
            + move)
        .then(m => self.fight(db, m, challenger, target, wager, challengerTurn));
    },
    getDamage(user, weapon) {
        if (weapon.insta && !Math.floor(Math.random() * 20)) {
            return 100;
        }
        const hit = user.cooldown ? 0 : Math.floor(Math.random() * (weapon.high + 1 - weapon.low)) + weapon.low;
        if (weapon.speed < 0) {
            user.cooldown = !user.cooldown;
        }
        return hit;
    }
};