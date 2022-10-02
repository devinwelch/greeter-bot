/**
 * Formats string to specified length
 * @param {string} str string to append spaces to
 * @param {number} max number of characters in return string
 * @returns string
 */

export function pad(str, max) {
    str = str.toString();
    return str.length > max
        ? str.slice(0, max)
        : str + ' '.repeat(Math.max(0, max - str.length));
}