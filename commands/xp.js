const { getData } = require('../utils.js');

module.exports = {
    name: 'xp',
    description: "Check a user's current level!",
    category: 'rpg',
    aliases: ['experience', 'exp', 'level', 'lvl'],
    usage: '[user|tag]',
    execute(client, config, db, message, args) {
        const userIDs = message.mentions.members.size
            ? message.mentions.members.map(u => u.id)
            : args.length 
                ? message.guild.members.cache.filter(mbr => mbr.displayName.toLowerCase() === args.toLowerCase()).map(m => m.id)
                : message.member.id;

        getData(db, userIDs)
        .then(data => {
            if (!data.Responses || !data.Responses.GBPs) {
                return;
            }

            data.Responses.GBPs.forEach(user => {
                let msg = `${user.Username} is level ${user.Lvl}`;
                if (user.Lvl === 99) {
                    msg += ', wow!';
                }
                else {
                    const delta = db.xp[user.Lvl] - db.xp[user.Lvl - 1];
                    const surplus = user.XP - db.xp[user.Lvl - 1];
                    msg +=  ` with ${surplus}/${delta} xp (${(100 * surplus / delta).toFixed(0)}%) towards the next!`;
                }
                message.channel.send(msg);
            });
        });
    }
};