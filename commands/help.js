module.exports = {
    name: 'help',
    description: 'List all of my commands or info about a specific command\n`<required argument>` `[optional argument]`',
    usage: '[command]',
    execute(client, config, db, message, args) {
        const reply = [];

        if (!args.length) {
            const cmds = client.commands.filter(cmd => !cmd.hideFromHelp).map(cmd => cmd.name).join(`**, **${config.prefix}`);
            reply.push(`Available commands: **${config.prefix}${cmds}**`);
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