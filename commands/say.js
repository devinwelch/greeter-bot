module.exports = {
    name: 'say',
    description: 'Lets Bus post a message from greeter-bot',
    usage: '<comment>',
    hideFromHelp: true,
    execute(client, config, db, message, args) {
        if (message.author.id === config.ids.bus) {
            client.channels.cache.get(config.ids.botchat).send(args);
        }
        else {
            console.log(`${message.author.username} is trying to control me!`);
        }
    }
};