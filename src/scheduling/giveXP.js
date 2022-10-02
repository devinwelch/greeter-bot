import { updateData } from '../data/updateData.js';

/**
 * give xp to members active in voice
 * @param client 
 * @param db 
 */

export function giveXP(client, db) {
    client.channels.cache.filter(channel => channel.type === 'GUILD_VOICE').each(channel => {
        channel.members.filter(m => !m.deaf).filter(m => !m.mute).each(m => updateData(db, m.user, { xp: 20 }));
    });
}