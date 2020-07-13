const { getRandom, selectRandom } = require('../../utils');
const { Fighter } = require('./fighter');
const { Weapon } = require('./weapon');
const { Action } = require('./action');
const config = require('../../config.json');

module.exports.Boss = class extends Fighter {
    constructor(clientMember, lvl, partySize) {
        super(lvl, clientMember);

        let winText;
        let icon;

        //select raid boss type
        this.type = getRandom(1, 3);
        switch (this.type) {
            case 1:
                this.bonus *= 1 + .1 * Math.min(partySize, 4);
                this.max = (70 + 80 * partySize) * this.bonus;
                this.name = 'greeter-bot';
                this.entrance = `A wild ${this.name} appeared!`;
                winText = ":w KO'd :l!";
                icon = config.ids.woop;
                break;
            case 2:
                this.max = (100 * partySize) * this.bonus;
                this.name = 'The Pentahook';
                this.entrance = 'In Paraguay there lives a man, five rusty hooks on his right hand, and rage consumes his every living day!';
                winText = ":w ate :l's face!";
                icon = config.ids.hook;
                break;
            case 3:
                this.max = 666;
                this.immune = true;
                this.start = Date.now();
                this.name = 'Beelzeboss';
                this.entrance = 'I AM COMPLETE!';
                winText = ':w made :l his bitch!';
                icon = config.ids.beel;
                break;
        }

        this.boss = true;
        this.hp = this.max;
        this.weapon = new Weapon({ win: winText, icon: icon });
    }

    getExit() {
        let text;

        switch(this.type) {
            case 1:
                return `${this.name} fainted!`;
            case 2:
                return 'Raise your hooks up to the sky and drink to absent friends!';
            case 3:
                text = `Fuck you, ${this.opponents[0].name}!`;
                if (this.opponents.length > 1) {
                    text += ` And fuck you, ${this.opponents[1].name}!`;
                }
                text += " I'll get you hooligaaaaaans...";
                return text;
        }
    }

    getAction(client, party, targets) {
        switch(this.type) {
            case 1:
                return this.woop(party, targets);
            case 2:
                return this.hook(party, targets);
            case 3:
                return this.beel(party, targets);
        }
    }

    woop(party, targets) {
        const actions = [];
        let extra = [];
        let text;

        //boss is asleep
        if (this.cooldown) {
            text = `${this.name} is waking up...`;
            this.cooldown = false;
        }
        //rest
        //restore hp up to once per raid
        else if (this.hp <= this.max / 3 && !this.rested) {
            const rest = 15 + (40 + Math.round(this.lvl / 2)) * (targets.length);
            text = `${this.name} used *rest*! He restored **${rest}** hp and fell asleep...`;
            this.hp += rest;
            this.cooldown = true;
            this.rested = true;
            this.poisoned = 0;
        }
        //aqua tail
        //single target dmg
        else if ((targets.some(p => p.hp <= 25 * this.bonus) && targets.every(p => p.hp > 15 * this.bonus)) || targets.length === 1) {
            const dmg = getRandom(20, 30) * this.bonus;
            const target = targets.sort(function (p1, p2) { return p1.hp - p2.hp; })[0];
            text = `${this.name} used *aqua tail*, hitting *${target.name}* for **${Math.round(dmg)}** dmg!`;
            extra = extra.concat(target.takeDmg(dmg, this, party));
            extra = extra.concat(this.applyStatus(target, 2.5));
        }
        //surf/earthquake
        //aoe dmg
        else {
            const surf = getRandom(1);
            const dmgs = [];
            targets.forEach(p => {
                const dmg = (surf ? getRandom(10, 15) : getRandom(5, 20)) * this.bonus;
                p.takeDmg(dmg, this, party);
                dmgs.push(Math.round(dmg));
                extra = extra.concat(p.takeDmg(dmg, this, party));
                extra = extra.concat(this.applyStatus(p, 2.5));
            });
            text = `${this.name} used *${surf ? 'surf' : 'earthquake'}*, hitting for: **${dmgs.join('**/**')}** dmg!`;
        }

        actions.push(new Action(text, this.position, party));
        return actions.concat(extra);
    }

    hook(party, targets) {
        let actions = [];

        this.immune = false;

        //grant immunity once per raid
        if (this.hp <= this.max / 4 && !this.drunk) {
            this.immune = true;
            this.drunk = true;
            this.poisoned = 0;

            actions.push(new Action("He's drinking some rum...", this.position, party, 2000));
            actions.push(new Action("This bastard can't be killed!", this.position, party));
        }
        //strike 5x
        else {
            for (let i = 0; i < 5; i++) {
                //stop if victorious
                const target = selectRandom(targets.filter(o => o.hp > 0));
                if (target) {
                    //rage
                    let dmg = getRandom(8, 12) * this.bonus;
                    dmg += dmg * (this.max - this.hp) / this.max;
                    target.takeDmg(dmg, this, party);

                    actions.push(new Action(`${this.name} hit ${target.name} for **${Math.round(dmg)}** dmg!`, this.position, party));
                    actions = actions.concat(this.applyStatus(target, 2.5));
                }
            }
        }

        return actions;
    }

    beel(party, targets) {
        const actions = [];
        let extra = [];
        let text;

        //remove immunity at 4:43
        if (Date.now() - this.start >= 283000 && this.immune) {
            this.immune = false;
            actions.push(new Action('Ow fuck! My fucking horn...', this.position, party, 2000));
            actions.push(new Action('Oh no!', this.position, party));
        }
        
        //aoe dmg
        const dmgs = [];
        targets.forEach(p => {
            const dmg = getRandom(1, 20) * this.bonus;
            p.takeDmg(dmg, this, party);
            dmgs.push(Math.round(dmg));
            extra = extra.concat(p.takeDmg(dmg, this, party));
            extra = extra.concat(this.applyStatus(p, 2.5));
        });

        const attack = [
            "Check this riff, it's fucking tasty!",
            "I'll make you squeal like a scarlet pimpernel!",
            'Taste my lightning, fuckers!',
            "There's never been a rock-off that I've ever lost!",
            'You brought me the pick and now you shall all die!',
            "Now I'm complete and my cock you will suck!"
        ];
        text = `${this.name}: ${selectRandom(attack)} **${dmgs.join('**/**')}** dmg`;
        

        actions.push(new Action(text, this.position, party));
        return actions.concat(extra);
    }
};