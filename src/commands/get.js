import { xpTable } from '../rpg/getLvl.js';
import { getData } from '../data/getData.js';
import { Item } from '../rpg/classes/item.js';
import { commify } from '../utils/commify.js';
import { Weapon } from '../rpg/classes/weapon.js';
import { getCoinData } from '../data/getCoinData.js';
import { databaseError } from '../utils/databaseError.js';

export default {
    name: 'get',
    description: 'Get some data about a user',
    category: 'misc',
    options: [{
        type: 3, //STRING
        name: 'attribute',
        description: 'What do you want to know about?',
        required: true,
        choices: [
            { name: 'GBP', value: 'gbp' },
            { name: 'Faith', value: 'faith' },
            { name: 'Renown', value: 'renown' },
            { name: 'XP', value: 'xp' },
            { name: 'All', value: 'all' }
        ]
    },
    {
        type: 6, //USER
        name: 'user',
        description: 'Which user you want to check out',
        required: false
    }],
    async execute(client, db, interaction) {
        //determine parameters
        const attribute = interaction.options.getString('attribute');
        const user = interaction.options.getUser('user') ?? interaction.user;

        //load data
        const data = await getData(db, user.id);
        if (!data) {
            return databaseError(interaction, attribute);
        }

        //grammar
        const verb = attribute === 'xp' ? 'is' : 'has';

        //format data
        const all = attribute === 'all';
        const lines = [`${user.username} ${verb}...`, '```'];

        if (attribute === 'gbp' || all) {
            //raw gbp
            lines.push(`• ${commify(data.GBPs)} good boy points (GBPs)`);

            //stash
            if (data.Stash) {
                lines.push(`• ${commify(data.Stash)} GBPs stashed away`);
            }

            //coins
            if (data.Coins) {
                let coin = await getCoinData(db);
                if (coin) {
                    coin = coin[coin.length - 1];
                }
                else {
                    return databaseError(interaction, 'Coin');
                }
                lines.push(`• ${commify(data.Coins)} NNC (${commify(data.Coins * coin)} GBPs)`);
            }

            //inventory value
            if (data.Inventory.length > 1) {
                let assets = data.Inventory.slice(1).reduce((a, b) => {
                    const item = b.weapon ? new Weapon(null, b) : new Item(b);
                    return a + item.sell();
                }, 0);
                lines.push(`• An inventory worth ${commify(assets)} GBPs`);
            }

            //loan
            if (data.Loan) {
                lines.push(`• *${commify(data.Loan)} GBPs in loans*`);
            }
        }

        //faith
        if (attribute === 'faith' || all) {
            lines.push(`• ${data.Faith} faith`);
        }

        //renown
        if (attribute === 'renown' || all) {
            lines.push(`• Gone on ${commify(data.Renown)} quests`);
        }

        //lvl + xp
        if (attribute === 'xp' || all) {
            let xp = `• Lvl ${data.Lvl}`;
            if (data.Lvl === 99) {
                xp += ', wow!';
            }
            else {
                const delta = xpTable[data.Lvl] - xpTable[data.Lvl - 1];
                const surplus = data.XP - xpTable[data.Lvl - 1];
                    xp +=  ` with ${commify(surplus)}/${commify(delta)} xp (${(100 * surplus / delta).toFixed(0)}%) towards the next!`;
            }
            lines.push(xp);
        }

        lines.push('```');
        interaction.reply(lines.join('\n'));
    }
};