const { delay, getRandom } = require('../utils.js');

module.exports = {
    name: 'roll',
    description: "Roll an *n*-sided die *x* times. Lower limit is optional (defaults to 1). 'd' character is optional if not rolling multiple dice.",
    category: 'misc.',
    aliases: ['rollfast'], //TODO:implement later
    usage: '[d][lower-]<upper limit>` *or* `[x]d<range>`\nExamples:\n```!roll 20\n!roll 3d6\n!roll 5-10``', //this is a mess
    execute(client, config, db, message, args) {
        let quick = false;

        if (!/(d?|\d+d)\d+(-\d+)?/.test(args)) {
            return message.reply(`Invalid format. Please use \`${config.prefix}${this.name} ${this.usage}\``);
        }

        let numberOfRolls = 1;
        if (/\d+d.+/.test(args)) {
            numberOfRolls = args.split(/d/)[0];
            if (numberOfRolls > 10) quick = true;
        }

        let rollMessage = `${message.author.username} rolled `;

        const range = args.replace(/(\d+d|d)/, '').split(/-/);
        const max = range.length === 2 ? Math.floor(Number(range[1])) : Math.floor(Number(range[0]));
        const min = range.length === 2 ? Math.floor(Number(range[0])) : 1;

        if (quick) {
            for(var i = 0; i < numberOfRolls; i++) {
                const roll = getRandom(min, max);
                rollMessage += `**${roll}**`;
                if (i !== numberOfRolls - 1) rollMessage += ',  ';
            }
            return message.channel.send(rollMessage);
        }
        
        message.channel.send(rollMessage)
            .then(editMessage => this.slowRoll(editMessage, min, max, numberOfRolls))
            .catch(console.error);
        
    },
    slowRoll(message, min, max, count) {
        delay(1500).then(() => {
            if (count-- === 0) return;
    
            const roll = getRandom(min, max);
            let newRoll = ` **${roll}**`;
            if (count !== 0) newRoll += ',  ';
        
            message.edit(message.content + newRoll)
                .then(thisMessage => this.slowRoll(thisMessage, min, max, count));
        });
    }
};