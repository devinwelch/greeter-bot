import { getPopularChannel } from '../sound/getPopularChannel.js';
import { getRandom } from '../utils/random.js';
import { playFile } from '../sound/playFile.js';

/**
 * sp00ky boi speaks in voice chat
 * @param client 
 * @returns void
 */

export function spook(client) {
    const voiceChannel = getPopularChannel(client);
    
    const startTime = getRandom(110);
    const duration = getRandom(3000, 7000);

    playFile(client, voiceChannel, 'other/sans.mp3', { seek: startTime, timeout : duration });
}