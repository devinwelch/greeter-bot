const { updateGBPs, delay, selectRandom, getRandom } = require('../utils.js');
const items = require('./items.json');

//re-uses a lot of code from duel for ease of use and specific balance changes
const self = module.exports = {
    name: 'raid',
    description: 'Join forces for a PVE raid. Loot pool is 8x wager, split among all party members.',
    usage: '[wager] [@users/here]',
    execute(client, config, db, message, args) {
        //change IDs for test server; should be commented in production
        config.ids.yeehaw = '700795024551444661';
        config.ids.baba   = '700795091501056111';
        config.ids.sanic  = '700795091501056111';
        config.ids.corona = '701886367625379938';
        
        //prevent double battling and slow-down
        if (client.user.raiding) {
            return message.reply('The last party just set off. Hop on the next one!');
        }

        const wager = /\d+.*/.test(args) ? Math.max(Math.floor(args.trim().split(/\D/, 1)[0]), 0) : 0;

        //send invite
        const invite = [];
        invite.push(`${message.member.displayName} is going on a quest! Buy-in is **${wager} GBPs**. Invite lasts up to 3 minutes.`);
        invite.push(`React with ${client.emojis.cache.get(config.ids.yeehaw)} to join the party.`);
        invite.push(`Leader, react with ${client.emojis.cache.get(config.ids.sanic)} to get started right away!`);
        message.channel.send(invite)
        .then(msg => {
            msg.react(config.ids.yeehaw);
            msg.react(config.ids.sanic);

            //anyone may join, but only party leader can start
            const filter1 = (reaction, user) => ((reaction.emoji.id === config.ids.yeehaw) || 
                (reaction.emoji.id === config.ids.sanic && user.id === message.member.id)) &&
                (user.id !== client.user.id);
            const collector1 = msg.createReactionCollector(filter1, { time: 180000 });

            collector1.on('collect', reaction => {
                //leader closes party
                if (reaction.emoji.id === config.ids.sanic) {
                    collector1.stop();
                }
            });
    
            collector1.on('end', collected => {
                //assemble party
                const party = collected.get(config.ids.yeehaw) 
                    ? collected.get(config.ids.yeehaw).users.cache.filter(u => !u.bot).array()
                    : [];
                if (!party.includes(message.author)) {
                    party.push(message.author);
                }

                //remove party members that can't afford buy-in
                self.getGBPs(db, party)
                .then((data) => {
                    if (!data.Responses || !data.Responses.GBPs) {
                        return message.channel.send('No users were found.');
                    }
                    const confirmedParty = [];
                    data.Responses.GBPs.forEach(user => {
                        if (user.GBPs >= wager) {
                            confirmedParty.push(party.find(p => p.id === user.UserID));
                        }
                    });
                    if (!confirmedParty.length) {
                        return msg.edit('**No members meet the requirements.**');
                    }

                    //push go/stop to leader
                    msg.reactions.removeAll()
                    .then(() => {
                        const edit = [];
                        edit.push(`Leader, react with ${client.emojis.cache.get(config.ids.yeehaw)} to start or ${client.emojis.cache.get(config.ids.baba)} to cancel.`);
                        edit.push('The party includes the following members:');
                        edit.push(confirmedParty.join(', '));
                        msg.edit(edit)
                        .then(() => {
                            msg.react(config.ids.yeehaw);
                            msg.react(config.ids.baba);

                            const filter2 = (reaction, user) => user.id === message.member.id;
                            const collector2 = msg.createReactionCollector(filter2, { time: 120000, max: 1 });

                            collector2.on('collect', reaction => {
                                //leader starts
                                if (reaction.emoji.id === config.ids.yeehaw) {
                                    self.start(client, db, config, message.guild, confirmedParty, data.Responses.GBPs, message.channel, wager);
                                }
                                //leader stop
                                else {
                                    msg.edit(msg.content + '\n\n**The raid was canceled**');
                                }
                            });

                            collector1.on('end', () => {
                                //do I want to delete this message? Probably
                            });
                        })
                        .catch(console.error);
                    })
                    .catch(console.error);
                })
                .catch((err) => {
                    console.log(err);
                    return message.channel.send('Something went wrong.');
                });
            }); 
        })
        .catch(console.error);
    },
    getGBPs(db, party) {
        //get data for each party member prospect
        const params = { RequestItems: { 'GBPs': { Keys: [] } }};
        party.forEach(user => {
            params.RequestItems['GBPs'].Keys.push({ UserID: user.id });
        });

        return db.batchGet(params).promise();
    },
    start(client, db, config, guild, party, data, channel, wager) {
        //setup each member
        const hp = {};
        party.forEach(user => {
            self.setup(config, guild, user, data.find(d => d.UserID === user.id));
            hp[user.id] = user.hp;
        });
        self.setupBoss(config, guild, client.user, party.length);
        hp[client.user.id] = client.user.hp;

        //add boss to party and randomize order based on weapon speed
        party = self.getOrder(party, client.user);

        //get battle results then display
        channel.send(self.getHeader(client.emojis, party, hp))
        .then(m => {
            self.display(client, m, self.fight(config, db, guild, party, wager), party, -1);
        });
    },
    setup(config, guild, user, data) {
        //reset initial stats so they do not persist from prior duels
        user.hp = 100;
        user.cooldown = false;
        user.selfKill = false;
        user.cursed = false;
        user.turn = getRandom(1);
        user.infected = guild.members.cache.get(user.id).roles.cache.has(config.ids.corona);

        //get random inventory item if 'random' is equipped
        if (data.Equipped === 'random') {
            const inventory = Object.keys(data.Inventory).filter(key => data.Inventory[key] && items[key] && items[key].weapon);
            user.weapon = items[selectRandom(inventory)];
        }
        else {
            user.weapon = items[data.Equipped];
        }
    },
    setupBoss(config, guild, boss, partySize) {
        //raid boss
        boss.original = 70 + 80 * partySize;
        boss.hp = boss.original;
        boss.raiding = true;
        boss.cooldown = false;
        boss.selfKill = false;
        boss.rested = false;
        boss.bonus = 1 + .1 * Math.min(partySize, 4);
        boss.infected = guild.members.cache.get(boss.id).roles.cache.has(config.ids.corona);
        boss.weapon = { id: config.ids.woop, speed: 1, hits: 1, win: 'The party wiped!' };
    },
    getOrder(party, boss) {
        //add boss to party for order purposes 
        party.push(boss);

        //get different weapon speeds
        const speeds = [];
        party.forEach(user => {
            if (!speeds.includes(user.weapon.speed)) {
                speeds.push(user.weapon.speed);
            }
        });
    
        let order = [];

        //randomize order of player per different weapon speed
        speeds.sort().reverse().forEach(speed => {
            const players = party.filter(user => user.weapon.speed === speed);
            for (var i = players.length - 1; i > 0; i--) {
                const j = getRandom(i);
                [players[i], players[j]] = [players[j], players[i]];
            }
            order = order.concat(players);
        });
        
        return order;
    },
    getHeader(emojis, party, hp) {
        //get user info for top of duel log
        const maxNameLength = Math.max(...party.map(u => u.username.length)) + 2;

        const header = [];
        party.forEach(user => {
            header.push(`${emojis.resolve(user.weapon.id)} ` + '`' + self.format(user.username, maxNameLength) + 'HP: ' + self.format(hp[user.id], 4) + '`');
        });

        return header.join('\n') + '\n';
    },
    format(str, max) {
        //use to format header in tabular style
        str = str.toString();
        return str + ' '.repeat(max - str.length);
    },
    display(client, message, actions, party, previousTurn) {
        if (actions.length) {
            //replace header with new HPs
            const action = actions.shift();
            let log = self.getHeader(client.emojis, party, action.hp);

            if (previousTurn <= action.turn) {
                log += message.content.split('\n').slice(party.length).join('\n');
            }

            //add next action
            log += `\n${'\t'.repeat(action.left? 0 : 2 * action.turn)}${action.text}`;

            //pause and edit message
            message.edit(log)
            .then(m => {
                delay(action.turn === party.length - 1 && action.turnEnd ? 3000 : action.turnEnd ? 1500 : 500).then(() => {
                    self.display(client, m, actions, party, action.turn);
                });
            })
            .catch(console.error);
        }
        else {
            //free bot for next raid
            party.find(p => p.bot).raiding = false;
        }
    },
    fight(config, db, guild, party, wager) {
        let actions = [];
        let turn = -1;

        //go through party order to get players turns until boss or raid party dies
        while(party.filter(u => !u.bot).some(u => u.hp > 0) && party.find(u => u.bot).hp > 0) {
            turn = ++turn % party.length;
            if (party[turn].hp <= 0) {
                continue;
            }
            actions = actions.concat(self.getTurn(config, guild, party, turn));
        }

        const tie = party.every(u => u.hp <= 0);
        actions = actions.concat(self.getResults(db, party, turn, wager, tie));

        return actions;
    },
    getTurn(config, guild, party, turn) {
        let actions = [];
        const turnPlayer = party[turn];

        //get damage action per weapon hit
        for (var i = 0; i < turnPlayer.weapon.hits; i++) {
            if (turnPlayer.bot) {
                actions.push(self.getBossAction(party, turn));
            }
            else {
                actions.push(self.getUserAction(party, turn));
            }
        }

        //if player is infected append status effect results after damage
        if (turnPlayer.infected && !turnPlayer.cursed) {
            const coronaDamage = getRandom(1, 2);
            turnPlayer.hp -= coronaDamage;
            turnPlayer.selfKill = turnPlayer.hp <= 0;
            const coronaText = `*...and ${turnPlayer.selfKill ? 'died' : `lost **${coronaDamage}** hp`} to corona*`;
            actions.push(new Action(coronaText, turn, party));

            //5% chance to infect opponent, half for bot
            if (turnPlayer.bot) {
                const opps = party.filter(p => !p.infected && !p.bot);
                opps.forEach(p => {
                    if (!getRandom(39)) {
                        actions.push(new Action(self.infect(config, guild, p), turn, party));
                    }
                });
            }
            else {
                const boss = party.find(u => u.bot);
                if (!getRandom(19) && !boss.infected) {
                    actions.push(new Action(self.infect(config, guild, boss), turn, party));
                }
            }
        }

        actions[actions.length - 1].turnEnd = true;
        return actions;
    },
    getUserAction(party, turn) {
        const turnPlayer = party[turn];
        const boss = party.find(u => u.bot);
        const weapon = turnPlayer.weapon;
        let text;

        //kamehameha
        if (weapon.sequence) {
            let dmg = 0;
            if (turnPlayer.turn >= weapon.sequence.length) {
                //make kamehameha viable after blast
                dmg = turnPlayer.turn * 5;
            }
            else if (turnPlayer.turn === weapon.sequence.length - 1) {
                //nerf from insta-kill
                dmg = 110;
            }
            boss.hp -= dmg;
            text = turnPlayer.username + weapon.sequence[Math.min(turnPlayer.turn, weapon.sequence.length - 1)]
                .replace('A', 'A'.repeat(Math.max(turnPlayer.turn - 5, 1)));
            text += dmg > 0 ? ` (**${dmg}** dmg)` : '';
            turnPlayer.turn++;
        }
        //7% chance to 'insta-kill' for scythes
        else if (weapon.insta && getRandom(99) < 7) {
            if (weapon.cursed) {
                text = `${turnPlayer.username} is just another victim of the bad girl's curse!`;
                turnPlayer.cursed = true;
                turnPlayer.hp = 0;
            }
            else {
                //nerf from insta-kill
                text = `${turnPlayer.username} called upon dark magicks to deal **60** dmg!`;
                boss.hp -= 60;
            }
        }
        else {
            if (turnPlayer.cooldown) {
                text = `${turnPlayer.username} is winding up...`;
            }
            else {
                let dmg = getRandom(weapon.low, weapon.high);
                if (weapon.zerk) {
                    dmg += Math.ceil(dmg * (100 - turnPlayer.hp) / 101);
                }
                if (weapon.name === 'warhammer') {
                    dmg -= 3;
                }
                text = `${turnPlayer.username} hit for **${dmg}** dmg!`;
                boss.hp -= dmg;
            }

            //slow weapons pause between turns
            if (weapon.speed < 0) {
                turnPlayer.cooldown = !turnPlayer.cooldown;
            }
        }

        return new Action(text, turn, party);
    },
    getBossAction(party, turn) {
        const boss = party[turn];
        const opps = party.filter(p => !p.bot && p.hp > 0);
        let text;

        //boss is asleep
        if (boss.cooldown) {
            text = `${boss.username} is waking up...`;
            boss.cooldown = false;
        }
        //rest
        //restore hp up to once per raid
        else if (boss.hp <= boss.original / 3 && !boss.rested) {
            const rest = 15 + 40 * (opps.length);
            text = `${boss.username} used *rest*! He restored **${rest}** hp and fell asleep...`;
            boss.hp += rest;
            boss.cooldown = true;
            boss.rested = true;
        }
        //aqua tail
        //single target dmg
        else if ((opps.some(p => p.hp <= 25) && opps.every(p => p.hp > 15)) || opps.length === 1) {
            const dmg = Math.floor(getRandom(20, 30) * boss.bonus);
            const target = opps.sort(function (p1, p2) { return p1.hp - p2.hp; })[0];
            text = `${boss.username} used *aqua tail*, hitting *${target.username}* for **${dmg}** dmg!`;
            target.hp -= dmg;
        }
        //surf/earthquake
        //aoe dmg
        else {
            const surf = getRandom(1);
            const dmgs = [];
            opps.forEach(p => {
                const dmg = Math.floor((surf ? getRandom(10, 15) : getRandom(5, 20)) * boss.bonus);
                p.hp -= dmg;
                dmgs.push(dmg);
            });
            text = `${boss.username} used *${surf ? 'surf' : 'earthquake'}*, hitting for: **${dmgs.join('**/**')}** dmg!`;
        }
        
        return new Action(text, turn, party);
    },
    infect(config, guild, player) {
        //add corona role and return action text
        const yuck = ['yuck!', 'eww!', 'gross!', '\\*coughs\\*'];

        guild.members.cache.get(player.id).roles.add(config.ids.corona);
        player.infected =- true;

        return `${player.username} **caught corona, ${selectRandom(yuck)}**`;
    },
    getResults(db, party, turn, wager, tie) {
        const actions = [];
        const turnPlayer = party[turn];
        const boss = party.find(p => p.bot);
        let winner;

        if (boss.hp > 0 || (turnPlayer.bot && party.filter(p => !p.bot).every(p => p.hp <= 0))) {
            winner = boss;
        }
        else {
            winner = turnPlayer;
        }
        
        //do not add execution text if boss self-killed
        if (winner === boss || !boss.selfKill) {
            const winText = winner.weapon.win.replace(':w', winner.username).replace(':l', boss.username);
            actions.push(new Action(winText, turn, party, true));
        }
        
        //award GBPs
        if (wager) {
            const players = party.filter(p => !p.bot);
            if (tie) {
                const tieText = 'No GBPs are awarded for a tie.';
                actions.push(new Action(tieText, turn, party, true));
            }
            else if (winner === boss) {
                players.forEach(p => updateGBPs(db, p, -wager));
                updateGBPs(db, boss, players.length * wager);
                console.log('lose');
            }
            else {
                const win = Math.ceil(wager * 8 / players.length);
                players.forEach(p => updateGBPs(db, p, win));
                updateGBPs(db, boss, players.length * win);
                console.log('win');
            }
        }

        return actions;
    }
};

class Action {
    constructor(text, turn, party, left = false) {
        this.text = text;
        this.turn = turn;
        this.left = left;

        this.hp = {};
        party.forEach(p => this.hp[p.id] = p.hp);
    }
}