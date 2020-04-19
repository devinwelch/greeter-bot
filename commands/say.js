module.exports = {
    name: 'say',
    description: 'Lets Bus post a message from greeter-bot',
    usage: '<comment>',
    hideFromHelp: true,
    execute(client, config, db, message, args) {
        if (message.author.id === '142444696738856960') {
            client.channels.get('466065580252725288').send(args);
        }
        else {
            console.log(`${message.author.username} is trying to control me!`);
        }
    }
};