module.exports = {
    name: 'poll',
    description: 'Create a poll with 2-9 options. Separate options with semicolons. Use reactions to vote.',
    aliases: ['ask'],
    usage: '<question>? <option 1>; <option 2>; [option 3]; ...',
    execute(client, config, db, message, args) {
        if (!/.+\?(.+){1,8};.+/.test(args)) {
            return message.channel.send(`Invalid format. Please use \`${config.prefix}${this.name} ${this.usage}\``);
        }

        const question = args.split('?')[0];
        const options = Array.from(new Set(args.substr(question.length + 1).split(';').filter(o => o.trim().length)));

        if (options.length < 2) {
            return message.channel.send("Don't be a communist - please use multiple options!");
        }
        else if (options.length > 9) {
            return message.channel.send("Too many options - I can't choose!");
        }

        const colors = ['🔴','🔵','🟢','🟠','🟣','⚫','⚪','🟤','🟡'];
        const poll = [];
        let optionCount = 0;

        poll.push('New poll: react to cast your ballot!');
        poll.push(`**${question}?**`);

        for(var i = 0; i < options.length; i++) {
            var option = options[i].trim();
            if (option.length) {
                poll.push(`${colors[i]} ${option}`);
                optionCount++;
            }
        }

        message.channel.send(poll)
            .then(poll => { 
                for (var i = 0; i < optionCount; i++) {
                    poll.react(colors[i]);
                }
            })
            .catch(console.error);
    }
};