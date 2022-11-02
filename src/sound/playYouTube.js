import { play } from './play.js';
import ytdl from 'ytdl-core';

/**
 * @param {*} options //seek, volume, timeout, rocking
 * @returns void
 */

export function playYouTube(client, voiceChannel, url, options) {
    if (ytdl.validateURL(url)) {
        options.volume = options.volume || 0.35;

        play(client, voiceChannel, ytdl(url, { filter: 'audioonly' }), options);

        return true;
    }
    else {
        return false;
    }
}