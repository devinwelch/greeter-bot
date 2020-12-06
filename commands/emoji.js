module.exports = {
    name: 'emoji',
    description: 'Add reactions to guess the next random emoji. Will only select server-specific custom emojis. Winner *should* be declared after a successful guess!',
    category: 'fun',
    execute(client, config, db, message, args) {
        return message.reply('A recent Discord API change broke me and caused a huge bug, so this table is closed until further notice :(.'); //BUG

        message.channel.send('**Guess the emoji** (using reactions)');
    }
};