const { getData, updateData, getRandom, react, playSong } = require('../utils.js');
const { Fighter, Action, getHeader, display, getOrder } = require('../fights');

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
        getData(db, [challenger.id, target.id])
        .then(data => {
            if (!data.Responses || !data.Responses.GBPs || data.Responses.GBPs.length !== 2) {
                return message.reply('Something went wrong.');
            }

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
            const chips = [config.ids.c1, config.ids.c5, config.ids.c10, config.ids.c25, config.ids.c100, config.ids.c500, config.ids.c1000];

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
            return self.setup(client, config, db, channel, challenger, target, bets, challengerData, targetData);
        }

        getData(db, candt.map(u => u.id))
        .then(data => {
            if (!data.Responses || !data.Responses.GBPs) {
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

            self.setup(client, config, db, channel, challenger, target, bets, challengerData, targetData);
        });
    },
    setup(client, config, db, channel, challenger, target, bets, challengerData, targetData) {
        //20% chance to play duel theme if both members in voice
        const voiceChannel = challenger.voice.channel;
        if (voiceChannel && voiceChannel === target.voice.channel && !getRandom(4)) {
            playSong(client, voiceChannel, 'duel.mp3');
        }

        challenger = new Fighter(config, challenger, { data: challengerData });
        target     = new Fighter(config, target    , { data: targetData     });

        //buff sequence weapons if opponent is infected
        challenger.turn = target.infected ? getRandom(1) : 0;
        target.turn = challenger.infected ? getRandom(1) : 0;

        const party = getOrder([challenger, target]);

        self.start(client, config, db, channel, challenger, target, party, bets);
    },
    start(client, config, db, channel, challenger, target, party, bets) {
        //send invite acceptance and initial header
        channel.send(`${target.member.displayName} accepted ${challenger.member.displayName}'s challenge! ${bets.wager ? bets.wager : 'No'} GBPs are on the line.`);
        channel.send(getHeader(client, party))
            .then(msg => {
                //pre-load fight
                const initiativeText = `${party[0].member.displayName} rolled initiative.`;
                let actions = [new Action(initiativeText, 0, party)];
                const fight = self.fight(config, party);
                actions = actions.concat(self.getResults(db, bets, party, fight));

                //edit message to show duel log
                display(client, msg, actions, party, 0, false);
            })
            .catch(console.error);
    },
    fight(config, party) {
        let actions = [];
        let turn = -1;

        //easter egg
        const wayOfVikings = party.every(fighter => fighter.weapon.steel) && !getRandom(9);
        const lyrics = [
            'Sparks fly high when steel meets steel',
            'And no one can believe',
            'That these two men are best friends',
            'Not enemies!',
            'In this fight of iron wills',
            'One man takes a knee',
            'The other goes for the kill',
            'Like an enemy!'
        ];

        if (wayOfVikings) {
            for(var i = 0; i < 4; i++) {
                actions.push(new Action(`*${lyrics[i]}*`, 0, party));
            }
            actions[actions.length - 1].turnEnd = true;
        }

        //fight til death
        while(party.every(fighter => fighter.hp > 0)) {
            turn = ++turn % party.length;
            actions = actions.concat(party[turn].getTurn(config, party, turn));
        }

        if (wayOfVikings) {
            for(i = 4; i < 8; i++) {
                actions.push(new Action(`*${lyrics[i]}*`, 0, party));
            }
            actions[actions.length - 1].turnEnd = true;
        }

        return {
            actions: actions,
            turn:    turn,
            winner:  party.find(fighter => fighter.hp >  0),
            loser:   party.find(fighter => fighter.hp <= 0)
        };
    },
    getResults(db, bets, party, fight) {
        //do not add execution text if loser self-kills
        let winText;
        if (fight.winner) {
            if (!fight.loser.selfKill) {
                winText = fight.winner.weapon.win
                    .replace(':w', fight.winner.member.displayName)
                    .replace(':l', fight.loser.member.displayName);
                fight.actions.push(new Action(winText, 0, party));
            }  
        }
        else {
            winText = party[fight.turn].weapon.win
                .replace(':w', party[fight.turn].member.displayName)
                .replace(':l', party[++fight.turn % party.length].member.displayName);
            fight.actions.push(new Action(winText, 0, party));
        }

        //tie
        if (!fight.winner) {
            let tieText = "\nIt's a tie...";
            if (bets.wager || Object.keys(bets.sideBets).length) {
                tieText += ' No GBPs are awarded.';
            }
            fight.actions.push(new Action(tieText, 0, party));
        }
        //award GBPs
        else {
            updateData(db, fight.winner.member.user, { gbps: bets.wager/*, xp: 250*/ });
            updateData(db, fight.loser.member.user, { gbps: -bets.wager });

            if (bets[fight.winner.id] && bets[fight.winner.id].length) {
                const wins = [];
                bets[fight.winner.id].forEach(w => {
                    if (bets.sideBets[w.id]) {
                        updateData(db, w, { gbps: bets.sideBets[w.id] });
                    }
                    wins.push(`**${w.username}** *(${bets.sideBets[w.id]})*`);
                });
                fight.actions.push(new Action(`\nSide bet winners: ${wins.join(', ')}`, 0, party));
            }

            if (bets[fight.loser.id] && bets[fight.loser.id].length) {
                const losses = [];
                bets[fight.loser.id].forEach(l => {
                    if (bets.sideBets[l.id]) {
                        updateData(db, l, { gbps: -bets.sideBets[l.id] });
                    }
                    losses.push(`**${l.username}** *(${bets.sideBets[l.id]})*`);
                });
                fight.actions.push(new Action(`Side bet losers: ${losses.join(', ')}`, 0, party));
            }
        }

        return fight.actions;
    }
};