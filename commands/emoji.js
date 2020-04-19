module.exports = {
    name: 'emoji',
    description: 'Add reactions to guess the next random emoji. Will only select server-specific custom emojis. Winner *should* be declared after a successful guess!',
    execute(client, config, db, message, args) {
        message.channel.send('**Guess the emoji** (using reactions)');
    }
};