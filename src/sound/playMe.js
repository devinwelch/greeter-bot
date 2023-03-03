import { join } from 'path';
import { readdirSync } from 'fs';
import { playFile } from './playFile.js';
import { getChance, selectRandom } from '../utils/random.js';

/**
 * @param {*} name //name of user
 * @param {*} options //gnomed, chud, base
 * @returns {string} filename
 */

export function playMe(client, voiceChannel, name, options) {
    let file, path;

    if (options?.gnomed && getChance(15)) {
        path = 'other';
        file = 'gnomed.mp3';
    }
    else if (options?.chud) {
        path = 'friends';
        file = 'chud5.mp3';
    }
    else if (options?.base) {
        path = 'friends';
        file = `${name}.mp3`;
    }
    else {
        const regex = RegExp('^' + name.toLowerCase());
        const files = readdirSync('audio/friends/').filter(file => regex.test(file));
        
        if (!files.length) {
            return;
        }
        
        path = 'friends';
        file = selectRandom(files);
    }

    playFile(client, voiceChannel, join(path, file), options);

    return file;
}