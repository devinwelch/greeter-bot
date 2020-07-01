const { updateData, getData } = require('../utils.js');

module.exports = {
    name: 'give',
    description: 'Donate GBPs to bring up our fellow sinners with your kind spirit.',
    category: 'gbp',
    aliases: ['donate'],
    usage: '<amount> <username/tag>',
    execute(client, config, db, message, args) {
        //amount to donate
        let amount = args.trim().split(' ', 1)[0];
        if (isNaN(amount)) {
            return message.reply(`Please use the format: \`${config.prefix}${this.name} \`${this.usage}`);
        }
        amount = Math.floor(amount);
        if (amount < 1) {
            return message.reply('Why would you try that?');
        }

        let recipient;

        //user mentions recipient
        if (message.mentions.members.size) {
            recipient = message.mentions.members.first().user;
        }
        //recipient written in plaintext
        else {
            const username = args.slice(amount.toString().length + 1).trim().toLowerCase();
            const users = /.+#\d{4}/.test(username)
            ? message.guild.members.cache.filter(mbr => mbr.user.tag.toLowerCase() === username)
                .map(function(m) { return m.user; })
            : message.guild.members.cache.filter(mbr => mbr.user.username.toLowerCase() === username)
                .map(function(m) { return m.user; });

            if (!users.length) {
                return message.reply('User not found!');
            }
            else if (users.length > 1) {
                return message.reply('Too many users found, please use their tag or @ them! `Example#1234`');
            }

            recipient = users[0];
        }

        if (recipient === message.author) {
            return message.reply("I'm pretty sure that's fraud.");
        }

        getData(db, message.author.id)
        .then(data => {
            if (!data.Responses || !data.Responses.GBPs) {
                message.reply('Something went wrong.');
            }
            else if (data.Responses.GBPs[0].GBPs < amount) {
                message.reply(`Whoa there, tiger! You only have ${data.Responses.GBPs[0].GBPs} GBPs!`);
            }
            else {
                updateData(db, message.author, { gbps: -amount });
                updateData(db, recipient, { gbps: amount });
                message.reply('You are a kind soul. Bless you.');
            }
        });
    }
};