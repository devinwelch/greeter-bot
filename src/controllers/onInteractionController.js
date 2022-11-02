export async function onInteraction(client, db, interaction) {
    if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName);

        //do not allow spammy commands in main chats
        if (['gbp', 'rpg'].includes(command.category) && 
            [client.ids.channels.mainChat, client.ids.channels.botchat].includes(interaction.channelId))
        {
            return interaction.reply({ content: 'Please use other channels for this command.', ephemeral: true });
        }

        try {
            await client.commands.get(interaction.commandName).execute(client, db, interaction);
        }
        catch (error) {
            console.error(error);
            await interaction.reply({ content: 'ERROR ERROR ERROR!', ephemeral: true });
        }
    }
    // else if (interaction.isSelectMenu()) {
    //     //currently no commands that fire on menu selection without additional button press
    //     interaction.deferUpdate();
    // }
}