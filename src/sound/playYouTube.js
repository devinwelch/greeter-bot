import { play } from './play.js';
import fluent from 'fluent-ffmpeg';
import ytdl from 'ytdl-core';

/**
 * @param {*} options //seek, volume, timeout, rocking
 * @returns void
 */

export function playYouTube(client, voiceChannel, url, options) {
    if (ytdl.validateURL(url)) {
        options.seek = options.seek || 0;
        options.volume = options.volume || 0.4;

        const song = fluent({ source: ytdl(url, { filter: 'audioonly' }) }).toFormat('mp3').setStartTime(options.seek);
        play(client, voiceChannel, song, options);

        return true;
    }
    else {
        return false;
    }
}