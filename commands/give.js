const { establishGBPs, updateGBPs } = require('../utils.js');

module.exports = {
    name: 'give',
    description: 'Donate GBPs to bring up our fellow sinners with your kind spirit.',
    aliases: ['donate'],
    usage: '<amount> <username/tag>',
    execute(client, config, db, message, args) {
        let amount = args.trim().split(' ', 1)[0];
        const username = args.slice(amount.length + 1).trim().toLowerCase();

        let tag = false;
        if (/.+#\d{4}/.test(username)) {
            tag = true;
        }

        if (isNaN(amount)) {
            return message.reply(`Please use the format: \`${config.prefix}${this.name} \`${this.usage}`);
        }

        amount = Math.floor(amount);

        if (amount < 1) {
            return message.reply('Why would you try that?');
        }
        
        const users = tag
            ? message.guild.members.cache.filter(mbr => mbr.user.tag.toLowerCase() === username)
                .map(function(m) { return m.user; })
            : message.guild.members.cache.filter(mbr => mbr.user.username.toLowerCase() === username)
                .map(function(m) { return m.user; });

        if (!users.length) {
            return message.reply('User not found!');
        }
        else if (users.length > 1) {
            return message.reply('Too many users found, please use their tag! `Example#1234`');
        }
        else if (users[0].id === message.author.id) {
            return message.reply("I'm pretty sure that's fraud.");
        }

        const params = {
            TableName: 'GBPs',
            Key: { 'UserID': message.author.id }
        };

        db.get(params, function(err, data) {
            if (err) {
                console.error(`Error. Unable to search for ${message.author.username}`);
                return message.reply('An error occured. Do not be alarmed.');
            } else if (!data.Item) {
                establishGBPs(db, message.author, 0);
                return message.reply("You haven't got the money!");
            } else if (data.Item.GBPs < amount) {
                return message.reply(`Whoa there, tiger! You only have ${data.Item.GBPs} GBPs!`);
            }

            updateGBPs(db, message.author, -amount);
            updateGBPs(db, users[0], amount);
            return message.reply('You are a kind soul. Bless you.');
        });
    }
};