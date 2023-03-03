import { playYouTube } from '../sound/playYouTube.js';
import ytdl from 'ytdl-core';

export default {
    name: 'sing',
    description: 'Play the first 10 seconds of a YouTube video',
    category: 'sound',
    options: [{
        type: 3, //STRING
        name: 'link',
        description: 'YouTube link',
        required: true
    },
    {
        type: 4, //INTEGER
        name: 'seek',
        description: 'Start time in seconds (currently broken)',
        required: false
    }],
    async execute(client, db, interaction) {
        if (!interaction.member.voice.channel || interaction.member.voice.deaf) {
            return interaction.reply({ content: 'Why sing if you cannot hear it?', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const url = interaction.options.getString('link');
        const seek = interaction.options.getInteger('seek');

        try {
            const info = await ytdl.getBasicInfo(url);
            interaction.editReply({ content: `You sang: ${info.videoDetails.title}`, ephemeral: true });
            playYouTube(client, interaction.member.voice.channel, url, { seek: seek, timeout: 10000 });
        }
        catch (error) {
            const message = `Error playing video: ${url}`;
            if (!interaction.replied) {
                interaction.editReply({ content: message, ephemeral: true });
            }
            console.log(`${message} from ${interaction.user.username}`);
        }
    }
};