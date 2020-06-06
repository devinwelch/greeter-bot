const { updateData, delay, selectRandom, assembleParty, react, playSong } = require('../utils.js');
const quicktime = ['🔴', '🔵', '🟢', '🟡'];

module.exports = {
    name: 'volcano',
    description:'Escape the volcano by timing reactions! Go solo or with a crew. Maximum wager: 100 GBPs.\n' +
                'Timing gets tighter the further along you go. Journey is 4 minutes, 18 seconds.\n' +
                "Use the word 'klok' to activate music.\n" +
                '**Solo:** make it to the end to double your wager.\n' +
                '**Crew:** last person remaining takes all. If multiple escape, pot is split among winners.',
    usage: '[wager] [klok]',
    execute(client, config, db, message, args) {
        const wager = Math.min(/\d+.*/.test(args) ? Math.max(Math.floor(args.trim().split(/\D/, 1)[0]), 0) : 0, 100);
        const klok = args.toLowerCase().indexOf('klok') !== -1 ? message.member.voice.channel : false;

        //send invite
        const invite = [];
        invite.push(`A volcano is about to erupt! Join ${message.member.displayName} to escape! Buy-in is **${wager} GBPs**.`);
        invite.push(`React with ${client.emojis.cache.get(config.ids.yeehaw)} to join the party.`);
        invite.push(`Leader, react with ${client.emojis.cache.get(config.ids.sanic)} to get started right away!`);
        
        assembleParty(client, config, db, message.channel, message.author, invite, wager)
        .then(results => {
            if (results) {
                start(client, db, message.channel, results.party, wager, klok);
            }
        });
    }
};

async function start(client, db, channel, party, wager, klok) {
    const status = {
        results: [],
        party: party.map(p => {
            return {
                user: p,
                distance: 3,
                strikes: 0,
                streak: 0,
                alive: true,
                death: undefined,
                reaction: undefined
            };
        })
    };

    const message = await channel.send(getDisplay(status));
    react(message, quicktime);
    await delay(5000);

    //play theme song
    if (klok) {
        playSong(client, klok, 'Volcano.mp3');
    }

    const startTime = Date.now();
    //4:18
    const songLength = 258000;

    while((Date.now() < startTime + songLength) && status.party.filter(p => p.alive).length) {
        //select quicktime button
        const qt = selectRandom(quicktime);
        await message.edit(getDisplay(status, qt));

        //time to react
        const time = getTime(startTime, songLength, klok);

        //wait for players to react to QTE
        await getReactions(status, message, qt, time, startTime);

        //show results
        await message.edit(getDisplay(status));

        //give a breather
        await delay(time);
    }
    
    finish(client, db, status, wager, klok, message, startTime);
}

function getDisplay(status, emoji) {
    const display = [];

    //QTE
    display.push(`**React with:** ${emoji || ''}`);
    display.push('```');

    //individual statuses
    status.party.forEach(p => display.push(
        '🌋' + '🔥'.repeat(p.strikes) + ' '.repeat(Math.max(0, p.distance - 2 * p.strikes)) + p.user.username + (p.alive ? '' : `(💀${p.deathTime})`)
    ));
    display.push('```');

    if (!status.results.length) {
        display.push('⠀');
        display.push('⠀');
    }
    
    status.results.forEach(l => display.push(l));
    
    return display;
}

function getTime(startTime, songLength, klok) {
    const now = Date.now();

    //sync speeds with song speed
    if (klok) {
        const speed = {
            slowest:2000,
            slower: 1750,
            slow:   1500,
            med:    1250,
            fast:   1000,
            faster: 750,
            fastest:666
        };

        const t = now - startTime;
        return (t < 38000 ) ? speed.slow   :
               (t < 48000 ) ? speed.slower :
               (t < 68000 ) ? speed.slow   :
               (t < 87000 ) ? speed.slower :
               (t < 105000) ? speed.med    :
               (t < 132000) ? speed.slowest:
               (t < 151000) ? speed.med    :
               (t < 166000) ? speed.fast   :
               (t < 190000) ? speed.slowest:
               (t < 214000) ? speed.faster :
               (t < 225000) ? speed.slower :
               (t < 244000) ? speed.faster : 
               (t < 253000) ? speed.fastest:
                              speed.slower ;

    }
    //get progressively faster for fights without song
    return 666 + Math.floor(Math.pow(Math.max(startTime + songLength - now, 0), 0.5));
}

async function getReactions(status, message, qt, time, startTime) {
    //only consider alive players
    const filter = (reaction, user) => status.party.filter(p => p.alive).some(p => p.user.id === user.id);
    const collector = message.createReactionCollector(filter, { time: time });

    collector.on('collect', (reaction, user) => {
        const member = status.party.find(p => p.user.id === user.id);

        //first react5ion of the round
        if (!member.reaction) {
            member.reaction = reaction.emoji.name;

            //stumble
            if (member.reaction !== qt) {
                member.streak = 0;
                burn(member, startTime);
            }
            else {
                //+1 distance for 5 in a row. fire = 2 distance
                member.streak++;
                if (member.streak === 5) {
                    member.streak = 0;
                    member.distance++;
                }
            }
        }
    });

    return new Promise(function(resolve) {
        collector.on('end', () => {
            //punish users that didn't react
            status.party.filter(p => p.alive).forEach(p => {
                if (!p.reaction) {
                    burn(p, startTime);
                }
                p.reaction = undefined;
            });
            resolve();
        });
    });
}

function getTimestamp(startTime) {
    //get format 'm:ss'
    const now = Date.now();
    const minute = Math.floor((now - startTime) / 60000);
    const second = Math.floor((now - startTime - (minute * 60000)) / 1000);

    return `${minute}:${second < 10 ? '0' : ''}${second}`;
}

function burn(member, startTime) {
    //member misses QTE
    member.strikes++;
    if (member.strikes * 2 >= member.distance) {
        member.death = Date.now();
        member.alive = false;
        member.deathTime = getTimestamp(startTime);
    }
}

async function finish(client, db, status, wager, klok, message, startTime) {
    message.reactions.removeAll();

    //if anyone escaped
    if (status.party.some(p => p.alive)) {
        status.results.push(`${status.party.filter(p => p.alive).map(p => p.user.username).join(', ')} escaped the volcano! We fear not death!`);
    }
    //all died
    else {
        const died = status.party.map(p => p.user.username);
        if (died.length) {
            status.results.push(`${died.join(', ')} ${died.length > 1 ? 'were' : 'was'} punished by the Earth!`);
        }
    }

    await delay(1500).then(message.edit(getDisplay(status)));
    
    //single person doubles wager if winning, gets reduced loss for close match 
    if (status.party.length === 1) {
        const mbr = status.party[0];
        let award;
        if (mbr.alive) {
            award = wager;
        }
        else if (mbr.death - startTime > 240000) {
            award = 0;
        }
        else if (mbr.death - startTime > 180000) {
            award = Math.floor(wager / -2);
        }
        else {
            award = -wager;
        }

        status.results.push(`You ${mbr.alive ? 'win' : 'lose'} ${Math.abs(award)} GBPs!`);
        if (award) {
            updateData(db, mbr.user, { gbps: award, xp: mbr.alive ? 500 : 0 });
            updateData(db, client.user, { gbps: -award });
        }
    }
    //free-for-all winner = survivor or who lasted the longest (within 1 sec)
    else {
        let winners = status.party.filter(p => p.alive);
        if (!winners.length) {
            const sorted = status.party.sort((a, b) => b.death - a.death);
            winners = status.party.filter(p => p.death + 1000 > sorted[0].death);
        }
        
        const losers = status.party.filter(p => !winners.includes (p));
        const win = Math.floor(losers.length * wager / winners.length);

        if (win) {
            losers.forEach(l => updateData(db, l.user, { gbps: -wager }));
            winners.forEach(w => updateData(db, w.user, { gbps: win, xp: 250 }));
        }
        
        if (winners.every(w => w.alive)) {
            if (winners.length === 1) {
                status.results.push(`The survivor claims ${win} GBPs!`);
            }
            else {
                status.results.push(`The survivors claim ${win} GBPs each!`);
            }
        }
        else {
            status.results.push(`${winners.map(w => w.user.username).join(', ')} made it the furthest, claiming ${win} GBPs!`);
        }
    }

    await delay(1500).then(message.edit(getDisplay(status)));

    const channel = message.guild.me.voice.channel;
    if (klok && channel) {
        channel.leave();
    }
}