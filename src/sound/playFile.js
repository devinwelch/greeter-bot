import { join } from 'path';
import { play } from './play.js';

/**
 * @param {string} pathToFile //path after 'audio/'
 * @returns void
 */

export function playFile(client, voiceChannel, pathToFile, options) {
    play(client, voiceChannel, join('audio/', pathToFile), options);
}