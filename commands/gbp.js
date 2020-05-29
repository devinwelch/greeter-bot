const { getGBPs } = require('../utils.js');

module.exports = {
    name: 'gbp',
    description: 'Find out how many good boy points you have! Maybe you can buy some tendies if you have enough...',
    usage: '[user]',
    execute(client, config, db, message, args) {
        const userIDs = args.length 
            ? message.guild.members.cache.filter(mbr => mbr.displayName.toLowerCase() === args.toLowerCase()).map(m => m.id)
            : [message.member.id];

        getGBPs(db, userIDs)
        .then(data => {
            if (!data.Responses || !data.Responses.GBPs) {
                return;
            }

            data.Responses.GBPs.forEach(user => message.channel.send(`${user.Username} has ${user.GBPs} good boy points and ${user.Stash} stashed away!`));
        });
    }
};