import { getVoiceConnection } from '@discordjs/voice';

export default {
    name: 'begone',
    description: 'Kick greeter-bot out of the voice channel',
    category: 'sound',
    execute(client, db, interaction) {
        let response;

        const connection = getVoiceConnection(interaction.guild.id);
        if (connection && !client.rocking) {
            connection.destroy();
            response = 'You did it. You killed me.';
        }
        else {
            response = "You can't kill the metal. The metal will live on.";
        }
        
        interaction.reply(response);
    }
};