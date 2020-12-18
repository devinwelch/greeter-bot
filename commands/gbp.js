const { getData, getCoinData } = require('../utils.js');
const { Item } = require('../rpg/classes/item');
const { Weapon } = require('../rpg/classes/weapon');

module.exports = {
    name: 'gbp',
    description: 'Find out how many good boy points you have! Maybe you can buy some tendies if you have enough...',
    category: 'gbp',
    usage: '[user]',
    execute: async function(client, config, db, message, args) {
        const userIDs = message.mentions.members.size
            ? message.mentions.members.map(u => u.id)
            : args.length 
                ? message.guild.members.cache.filter(mbr => mbr.displayName.toLowerCase() === args.toLowerCase()).map(m => m.id)
                : message.member.id;

        let coin = await getCoinData(db);
        if (coin) {
            coin = coin[coin.length - 1];
        }
        else {
            return;
        }

        getData(db, userIDs)
        .then(data => {
            if (!data.Responses || !data.Responses.GBPs) {
                return;
            }

            data.Responses.GBPs.forEach(user =>  {
                let text = `${user.Username} has ${user.GBPs} good boy points`;

                if (user.Stash) {
                    text += `, ${user.Stash} GBPs stashed away`;
                }

                if (user.Inventory.length > 1 || user.Coins) {
                    let assets = user.Inventory.slice(1).reduce((a, b) => {
                        const item = b.weapon ? new Weapon(b) : new Item(b);
                        return a + item.sell();
                    }, 0);
                    
                    if (user.Coins) {
                        assets += user.Coins * coin;
                    }

                    text += `, ${assets} GBPs in assets`;
                }

                if (user.Loan) {
                    text += `, ${user.Loan} GBPs in loans`;
                }

                const count = (text.match(/, /g) || []).length;

                if (count === 1) {
                    text = text.replace(', ', ' and ');
                }
                if (count > 1) {
                    const i = text.lastIndexOf(', ') + 2;
                    text = text.slice(0, i) + 'and ' + text.slice(i);
                }

                text += '!';

                message.channel.send(text);
            });
        });
    }
};