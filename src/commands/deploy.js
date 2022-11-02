import { Role } from 'discord.js';

export default {
    name: 'deploy',
    description: 'Deploy command to current server',
    category: 'misc',
    options: [{
        type: 3, //STRING
        name: 'name',
        description: 'Name of command you want to deploy',
        required: true,
    },
    {
        type: 9, //MENTIONABLE
        name: 'user-or-role',
        description: 'User or role that is given explicit permission to use this command',

    }],
    defaultPermission: false,
    async execute(client, db, interaction) {
        const commandName = interaction.options.getString('name');
        if (commandName === 'all') {
            client.commands.forEach(async cmd => {
                try {
                    await client.guilds.cache.get(interaction.guildId)?.commands.create(cmd);
                    console.log(`Deployed command: ${cmd.name}`);
                }
                catch {
                    console.log(`FAILED TO DEPLOY: ${cmd}`);
                }
            });
            console.log('Finished deploying!');
        }
        else if (client.commands.has(commandName)) {
            const cmd = client.commands.get(commandName);
            const command = await client.guilds.cache.get(interaction.guildId)?.commands.create(cmd);
            console.log(`Deployed command: ${commandName}`);

            const mentionable = interaction.options.getMentionable('user-or-role');
            if (mentionable) {
                const permissions = { permission: true, id: mentionable.id, type: mentionable instanceof Role ? 'ROLE' : 'USER' };
                await command.permissions.set({ permissions: [permissions] });
                console.log(`Permissions set for ${permissions.type.toLowerCase()}: ${permissions.id}`);
            }

            interaction.reply(`Command **${commandName}** is ready to go!`);
        }
        else {
            interaction.reply({ content: 'Command not found', ephemeral: true });
        }
    }
};