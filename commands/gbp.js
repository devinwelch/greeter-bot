const { establishGBPs } = require('../utils.js');

module.exports = {
    name: 'gbp',
    description: 'Find out how many good boy points you have! Maybe you can buy some tendies if you have enough...',
    usage: '[user]',
    execute(client, config, db, message, args) {
        const users = args.length 
            ? message.guild.members.cache.filter(mbr => mbr.user.username === args)
                .map(function(m) { return m.user; })
            : [message.author];

        users.forEach(u => this.getGBPs(db, u, message.channel, users.length > 1));
    },
    getGBPs(db, user, channel, multiple) {
        const params = {
            TableName: 'GBPs',
            Key: {
                'Username': user.username,
                'ID': user.id
            }
        };

        let GBPs;
        db.get(params, function(err, data) {
            if (err) {
                console.error(`Error. Unable to search for ${user.username}`);
                GBPs = '???';
            } else if (!data.Item) {
                establishGBPs(db, user, 0);
                GBPs = 0;
            } else {
                GBPs = data.Item.GBPs;
            }
            channel.send(`${multiple ? user.tag : user.username} has ${GBPs} good boy points!`);
        });
    }
};