const { react } = require('../utils');

module.exports = {
    name: 'suggest',
    description: 'Make a suggestion for how to update greeter-bot.',
    category: 'misc',
    execute(client, config, db, message, args) {
        react(message, config.ids.trash);
    }
};