import { getRandom } from './random.js';

/**
 * Infects a random user per voice channel if some members of channel are infected. Immune users not considered.
 * @returns void
 */

export function infect(client) {
    client.channels.cache.filter(channel => channel.type === 'GUILD_VOICE').forEach(voiceChannel => {
        const noninfected = voiceChannel.members.filter(member => !member.roles.cache.has(client.ids.roles.corona));
        
        if (noninfected.size) { 
            const infectedCount = voiceChannel.members.size - noninfected.size;
            const percentChances = [0, 10, 12, 15, 20, 30, 50, 75, 100];

            const chance = percentChances[Math.min(8, infectedCount)];
            const roll = getRandom(99);
    
            if (infectedCount) {
                console.log(`Rolled ${roll} against ${chance}% odds in channel: ${voiceChannel}`);
            }
    
            if (roll < chance) {
                const victim = noninfected.random(1)[0];
                if (client.ids.users.immune.includes(victim.id)) {
                    return;
                }
                
                victim.roles.add(client.ids.roles.corona);

                const botchat = client.channels.cache.get(client.ids.channels.botchat);
                botchat.messages.fetch({ limit: 100 })
                .then(messages => {
                    messages.filter(msg => msg.mentions.has(victim) && msg.content.includes('Yuck, stay away'))
                    .forEach(msg => {
                        msg.delete().catch(console.error);
                        process.on('unhandledRejection', () => {});
                    });
                });
                client.channels.cache.get(client.ids.channels.botchat).send(`${victim} caught the coronavirus! Yuck, stay away!`);
            }
        }
    });
}