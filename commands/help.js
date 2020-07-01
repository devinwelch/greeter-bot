module.exports = {
    name: 'help',
    description: 'List all of my commands or info about a specific command\n`<required argument>` `[optional argument]`',
    category: 'misc.',
    usage: '[command]',
    execute(client, config, db, message, args) {
        const reply = [];

        if (!args.length) {
            const categories = {};
            client.commands.filter(cmd => !cmd.hideFromHelp).forEach(cmd => {
                if (categories[cmd.category]) {
                    categories[cmd.category].push(cmd.name);
                }
                else {
                    categories[cmd.category] = [cmd.name];
                }
            });

            reply.push('Available commands:');
            Object.keys(categories).sort((a, b) => categories[b].length - categories[a].length).forEach(cat => reply.push(`**${cat}:** ${categories[cat].join(', ')}`));
            reply.push('');
            reply.push(`Use \`${config.prefix}${this.name} ${this.usage}\` to find out more about a specific command.`);

            return message.channel.send(reply, {split: true});
        }
        else {
            args = args.replace('!', '');
            const command = client.commands.get(args) ||
                client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(args));

            if (!command) {
                reply.push(`Command not found. Use \`${config.prefix}${this.name}\` for a list of available commands.`);
            }
            else {
                if (command.description) reply.push(command.description);
                if (command.usage) reply.push(`Usage: \`${config.prefix}${command.name} ${command.usage}\``);
                if (command.aliases) reply.push(`Aliases: \`${command.aliases.join(', ')}\``);
            }
        }

		message.channel.send(reply, { split: true });
    }
};