import { join } from 'path';
import { readdirSync } from 'fs';
import { playFile } from './playFile.js';
import { getChance, selectRandom } from '../utils/random.js';

/**
 * @param {*} name //name of user
 * @param {*} options //gnomed, chud
 * @returns {string} filename
 */

export function playMe(client, voiceChannel, name, options) {
    let file;

    if (options?.gnomed && getChance(15)) {
        file = 'other/gnomed.mp3';
    }
    else if (options?.chud) {
        file = 'friends/chud5.mp3';
    }
    else {
        const regex = RegExp('^' + name.toLowerCase());
        const files = readdirSync('audio/friends/').filter(file => regex.test(file));
        
        if (!files.length) {
            return;
        }
        
        file = selectRandom(files);
    }

    playFile(client, voiceChannel, join('friends', file), options);

    return file;
}