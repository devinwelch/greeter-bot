/**
 * Reacts to message. Returns true if successful, false otherwise.
 * @param {*} message Discord Message
 * @param {*} emojis emoji or emoji[]
 * @returns boolean
 */

export function react(message, emojis) {
    try {
        if (!Array.isArray(emojis)) {
            emojis = [emojis];
        }
        emojis.forEach(emoji => {
            const reaction = message.reactions.cache.find(reaction => reaction.emoji.id === emoji || reaction.emoji.name === emoji);
            if (!reaction || !reaction.users.cache.has(reaction.client.user.id)) {
                message.react(emoji);
            }
        });
        return true;
    }
    catch (err) {
        console.log(err);
        return false;
    }
}