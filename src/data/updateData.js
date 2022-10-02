import { putData } from '../data/putData.js';
import { getLvl } from '../rpg/getLvl.js';
import { generateWeapon } from '../rpg/generateWeapon.js';
import { react } from '../utils/react.js';

/**
 * Update user data
 * @param {*} config 
 * @param {*} db 
 * @param {*} user Discord User or userID
 * @param {=} options { gbps, stash, loan, coins, boxes, xp, skills, inventory, tickets, equipped, reequip, team, faith, renown, lastSpent, username, message, emoji }
 * @returns void
 */

export function updateData(db, user, options) {
    //user can be a (user object) or (user id string)
    const id = user.id || user;
    const params = {
        TableName: 'GBPs',
        Key: { 'UserID': id }
    };

    //find user data
    db.get(params, function(err, data) {
        if (err) {
            console.error(`Error. Unable to get data for ${user.username}`);
        } 
        //user not found
        else if (!data.Item) {
            putData(db, user, options);
        } 
        //update existing user
        else {
            const expressions = [];
            const attributes  = {};
            const d = data.Item;

            if (options.gbps) {
                expressions.push('GBPs = GBPs + :gbps');
                attributes[':gbps'] = options.gbps;

                const highscore = d.GBPs + d.Stash - (isNaN(options.loan) ? d.Loan : options.loan) + (options.stash || 0) + options.gbps;
                if (highscore > d.HighScore) {
                    expressions.push('HighScore = :highscore');
                    attributes[':highscore'] = highscore;
                }
            }

            if (options.stash) {
                expressions.push('Stash = Stash + :stash');
                attributes[':stash'] = options.stash;
            }

            if (!isNaN(options.loan)) {
                expressions.push('Loan = :loan');
                attributes[':loan'] = options.loan;
            }

            if (options.coins) {
                expressions.push('Coins = Coins + :coins');
                attributes[':coins'] = options.coins;
            }

            if (options.boxes) {
                expressions.push('Boxes = Boxes + :boxes');
                attributes[':boxes'] = options.boxes;
            }

            if (options.xp) {
                expressions.push('XP = XP + :xp');
                attributes[':xp'] = options.xp;

                const lvl = getLvl(d.XP + options.xp);
                if (lvl > d.Lvl) {
                    expressions.push('Lvl = :lvl');
                    attributes[':lvl'] = lvl;

                    expressions.push('Inventory[0] = :fists');
                    attributes[':fists'] = generateWeapon(lvl, { type: 'fists', chances: [1, 0, 0, 0, 0], plain: true });
                    
                    //announce to the world
                    if (user.client) {
                        const client = user.client;
                        const botchat = client.channels.cache.get(client.ids.channels.botchat);
                        botchat.messages.fetch({ limit: 100 })
                        .then(messages => {
                            messages.filter(msg => msg.mentions.has(user) && msg.content.includes('leveled up to'))
                            .forEach(msg => msg.delete().catch(console.error));
                        });
                        botchat.send(`${user} leveled up to ${lvl}!`);
                    }
                }
            }

            if (options.skills) {
                if (Object.keys(options.skills).length) {
                    Object.keys(options.skills).forEach(i => {
                        expressions.push(`Skills.${i} = :${i}`);
                        attributes[`:${i}`] = options.skills[i];
                    });
                }
                else {
                    expressions.push('Skills = :skills');
                    attributes[':skills'] = {};
                }
            }

            if (options.inventory) {//TODO stacking
                if (!Array.isArray(options.inventory)) {
                    options.inventory = [options.inventory];
                }
                if (options.inventory.length) {
                    expressions.push('Inventory = list_append(Inventory, :inventory)');
                    attributes[':inventory'] = options.inventory;
                }
            }

            if (options.tickets) {
                if (!Array.isArray(options.tickets)) {
                    options.tickets = [options.tickets];
                }
                if (options.tickets.length) {
                    expressions.push('Tickets = list_append(Tickets, :tickets)');
                    attributes[':tickets'] = options.tickets;
                }
            }

            if (!isNaN(options.equipped) && options.equipped !== d.Equipped) {
                expressions.push('Equipped = :equipped');
                attributes[':equipped'] = options.equipped;
            }

            if (options.reequip) {
                if (d.Equipped === options.reequip) {
                    expressions.push('Equipped = :equipped');
                    attributes[':equipped'] = 0;
                }
                else if (d.Equipped > options.reequip) {
                    expressions.push('Equipped = Equipped + :reequip');
                    attributes[':reequip'] = -1;
                }
            }

            if (options.team) {
                expressions.push('Team = :team');
                attributes[':team'] = options.team;
            }

            if (options.faith) {
                expressions.push('Faith = Faith + :faith');
                attributes[':faith'] = options.faith;
            }

            if (options.renown) {
                expressions.push('Renown = Renown + :renown');
                attributes[':renown'] = options.renown;
            }

            if (options.lastSpent) {
                expressions.push('LastSpent = :lastSpent');
                attributes[':lastSpent'] = options.lastSpent;
            }

            if (user.username && user.username.toLowerCase() !== d.Username) {
                expressions.push('Username = :username');
                attributes[':username'] = user.username.toLowerCase();
            }

            //skip if nothing to update
            if (!Object.keys(attributes).length) {
                return;
            }

            params.UpdateExpression = 'set ' + expressions.join(', ');
            params.ExpressionAttributeValues = attributes;

            db.update(params, function(err) {
                if (err) {
                    console.log('Unable to update user. Error JSON:', JSON.stringify(err, null, 2));
                }
                else if (options.message && options.emoji) {
                    react(options.message, options.emoji);
                }
            });
        }
    });
}