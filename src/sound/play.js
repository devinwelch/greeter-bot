import { 
    joinVoiceChannel,
    getVoiceConnection,
    createAudioPlayer,
    createAudioResource,
    StreamType,
    AudioPlayerStatus
} from '@discordjs/voice';
import ffmpeg from 'fluent-ffmpeg';

 /**
  * @param {*} options  //seek, volume, timeout, rocking
  * @returns void
  */

export function play(client, voiceChannel, source, options) {
    //return if:
    //  voice channel doesn't exist
    //  already connected to voice
    //  in 'quiet' channel
    if (!voiceChannel || getVoiceConnection(voiceChannel.guild.id) || voiceChannel.parent?.id === client.ids.channels.foil) {   
        return;
    }

    //join voice channel
    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false
    });

    //audio streaming options
    const audioOptions = {
        inputType: StreamType.Arbitrary,
        inlineVolume: true
    };

    //seek
    source = ffmpeg(source).toFormat('mp3').setStartTime(options?.seek || 0);

    //play
    const resource = createAudioResource(source, audioOptions);
    resource.volume.setVolume(options?.volume || 1);
    const audioPlayer = createAudioPlayer();
    connection.subscribe(audioPlayer);
    audioPlayer.play(resource);

    //handle errors
    audioPlayer.on('error', error => console.error(`Error: ${error.message} with resource ${source}`));

    //optional timeout and 'rocking' flag
    audioPlayer.on(AudioPlayerStatus.Playing, () => {
        if (options?.timeout) {
            setTimeout(() => {
                destroy(client, audioPlayer, connection);
            }, options.timeout);
        }

        if (options?.rocking) {
            client.rocking = true;
        }
    });

    //disconnect at end of audio track
    audioPlayer.on(AudioPlayerStatus.Idle, oldState => {
        if (oldState.status === AudioPlayerStatus.Playing) {
            destroy(client, audioPlayer, connection);
        }
    });
}

function destroy(client, audioPlayer, connection) {
    try {
        client.rocking = false;
        audioPlayer.stop();
        connection.destroy();
    }
    catch (error) {
        //I don't actually care
    }
}