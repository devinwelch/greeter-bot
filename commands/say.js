const { react } = require('../utils');

module.exports = {
    name: 'say',
    description: 'Lets Bus post a message from greeter-bot',
    usage: '<comment>',
    hideFromHelp: true,
    execute(client, config, db, message, args) {
        if (message.author.id === config.ids.bus) {
            message.channel.send('1️⃣ announcements\n2️⃣ main chat\n3️⃣ exchange')
            .then(msg => {
                react(msg, ['1️⃣', '2️⃣', '3️⃣']);

                const filter = (reaction, user) => user === message.author;
                const collector = msg.createReactionCollector(filter, { time: 60000, max: 1 });

                collector.on('end', collected => {
                    let channel;

                    if (collected.has('1️⃣')) {
                        channel = config.ids.botchat;
                    }
                    else if (collected.has('2️⃣')) {
                        channel = config.ids.mainChat;
                    }
                    else if (collected.has('3️⃣')) {
                        channel = config.ids.exchange;
                    }
                    else {
                        return message.reply('Please select an option next time!');
                    }

                    client.channels.cache.get(channel).send(args);
                });
            });
        }
        else {
            console.log(`${message.author.username} is trying to control me!`);
        }
    }
};