const { updateData, getRandom, assembleParty, delay } = require('../utils.js');
const { Fighter, Action, getHeader, display, getOrder } = require('../fights');

//re-uses a lot of code from duel for ease of use and specific balance changes
const self = module.exports = {
    name: 'raid',
    description: 'Join forces for a PVE raid. Loot pool is 8x wager, split among all party members.',
    usage: '[wager] [@users/here]',
    execute(client, config, db, message, args) {
        const wager = /\d+.*/.test(args) ? Math.max(Math.floor(args.trim().split(/\D/, 1)[0]), 0) : 0;

        //send invite
        const invite = [];
        invite.push(`${message.member.displayName} is going on a quest! Buy-in is **${wager} GBPs**. Invite lasts up to 3 minutes.`);
        invite.push(`React with ${client.emojis.cache.get(config.ids.yeehaw)} to join the party.`);
        invite.push(`Leader, react with ${client.emojis.cache.get(config.ids.sanic)} to get started right away!`);
        
        assembleParty(client, config, db, message.channel, message.author, invite, wager)
        .then(results => {
            if (results) {
                self.start(client, db, message.guild, results.party, results.data.Responses.GBPs, message.channel, wager);
            }
        });                     
    },
    start(client, db, guild, party, data, channel, wager) {
        let fighterParty = [];

        //setup each member
        party.forEach(user => {
            const member = guild.members.resolve(user);
            const fighter = new Fighter(member, { data: data.find(d => d.UserID === user.id) });
            fighter.turn = getRandom(1);
            fighterParty.push(fighter);
        });

        //average of all party members, re-averaged with highest level to add weight 
        //const lvl = Math.round(((data.map(d => d.Lvl).reduce((a, b) => a + b) / data.length) + Math.max(...data.map(d => d.Lvl))) / 2);
        const lvl = Math.max(...data.map(d => d.Lvl));

        const bossMember = guild.members.resolve(client.user);
        const boss = new Fighter(bossMember, { boss: true, partySize: party.length, lvl: lvl });

        //add boss to party and randomize order based on weapon speed
        fighterParty.push(boss);
        fighterParty = getOrder(fighterParty);

        //get battle results then display
        channel.send(`${boss.member.displayName} (Lvl ${boss.lvl}) stands fierce!`);
        channel.send(getHeader(client, fighterParty))
        .then(msg => {
            const fight = self.fight(fighterParty);
            fight.actions = fight.actions.concat(self.getResults(db, wager, fighterParty, fight));
            delay(3000).then(() => display(client, msg, fight.actions, fighterParty, 0, true));
        });
    },
    fight(party) {
        let actions = [];
        let turn = -1;

        //fists bonus
        for(let i = 0; i < party.length; i++) {
            const fighter = party[i];
            if (fighter.weapon.name === 'fists' && fighter.skills.fists) {
                const opponent = party.find(opponent => opponent.boss);
                const multiplier = 0.4 + fighter.skills.fists * 0.3;
                const dmg = Math.round(multiplier * getRandom(fighter.weapon.low, fighter.weapon.high) * fighter.bonus);
                const text = `${fighter.member.displayName} sucker-punched ${opponent.member.displayName} for **${dmg}** dmg!`;
                opponent.hp -= dmg;
                actions.push(new Action(text, 0, party));
            }
        }

        //go through party order to get players turns until boss or raid party dies
        while(
            party.filter(fighter => !fighter.boss).some(fighter => fighter.hp > 0) &&
            party.find(fighter => fighter.boss).hp > 0
        ) {
            turn = ++turn % party.length;
            if (party[turn].hp <= 0) {
                continue;
            }
            
            actions = actions.concat(party[turn].getTurn(party, turn, party[turn].boss ? getBossAction : undefined));
        }

        return {
            actions: actions,
            turn: turn
        };
    },
    getResults(db, wager, party, fight) {
        const actions = [];
        const turnPlayer = party[fight.turn];
        const boss = party.find(p => p.boss);
        let winner;

        if (boss.hp > 0 ||
            (turnPlayer.boss && party.filter(fighter => !fighter.boss).every(fighter => fighter.hp <= 0)))
        {
            winner = boss;
        }
        else {
            winner = turnPlayer.boss ? party.filter(fighter => !fighter.boss)[0] : turnPlayer;
        }
        
        //do not add execution text if boss self-killed
        if (winner === boss || !boss.selfKill) {
            const winText = winner.weapon.win.replace(':w', winner.member.displayName).replace(':l', boss.member.displayName);
            actions.push(new Action(winText, 0, party));
        }
        
        //award GBPs
        const players = party.filter(fighter => !fighter.boss);
        if (party.every(fighter => fighter.hp <= 0)) {
            if (wager) {
                const tieText = 'No GBPs are awarded for a tie.';
                actions.push(new Action(tieText, 0, party));
            } 
        }
        else if (winner === boss) {
            players.forEach(fighter => updateData(db, fighter.member.user, { gbps: -wager }));
            updateData(db, boss.member.user, { gbps: players.length * wager });
        }
        else {
            const win = Math.ceil(wager * 8 / players.length);
            const xp  = Math.ceil(2000 / players.length);
            const awardText = `Each player wins ${win} GBPs and ${xp} xp!`;
            players.forEach(fighter => updateData(db, fighter.member.user, { gbps: win, xp: xp }));
            updateData(db, boss.member.user, { gbps: -players.length * win });
            actions.push(new Action(awardText, 0, party));
        }

        return actions;
    }
};

function getBossAction(party, turn) {
    const boss = party[turn];
    const opps = party.filter(fighter => !fighter.boss && fighter.hp > 0);
    let text;

    //boss is asleep
    if (boss.cooldown) {
        text = `${boss.member.displayName} is waking up...`;
        boss.cooldown = false;
    }
    //rest
    //restore hp up to once per raid
    else if (boss.hp <= boss.max / 3 && !boss.rested) {
        const rest = 15 + (40 + Math.round(boss.lvl / 2)) * (opps.length);
        text = `${boss.member.displayName} used *rest*! He restored **${rest}** hp and fell asleep...`;
        boss.hp += rest;
        boss.cooldown = true;
        boss.rested = true;
        boss.poisoned = 0;
    }
    //aqua tail
    //single target dmg
    else if ((opps.some(p => p.hp <= 25) && opps.every(p => p.hp > 15)) || opps.length === 1) {
        const dmg = Math.floor(getRandom(20, 30) * boss.bonus);
        const target = opps.sort(function (p1, p2) { return p1.hp - p2.hp; })[0];
        text = `${boss.member.displayName} used *aqua tail*, hitting *${target.member.displayName}* for **${dmg}** dmg!`;
        attack(boss, target, dmg);
    }
    //surf/earthquake
    //aoe dmg
    else {
        const surf = getRandom(1);
        const dmgs = [];
        opps.forEach(p => {
            const dmg = Math.floor((surf ? getRandom(10, 15) : getRandom(5, 20)) * boss.bonus);
            attack(boss, p, dmg);
            dmgs.push(dmg);
        });
        text = `${boss.member.displayName} used *${surf ? 'surf' : 'earthquake'}*, hitting for: **${dmgs.join('**/**')}** dmg!`;
    }
    
    return text;
}

//this function does not provide text for upgraded kamehameha and sword effects
function attack(boss, player, dmg) {
    if (player.shield > 0) {
        player.shield -= dmg;
    }
    else {
        player.hp -= dmg;
    }

    if (player.weapon.name === 'sword' && player.skills.sword) {
        boss.hp -= Math.round(0.06 * player.skills.sword * dmg);
    }
}