/**
 * Return multiplier based on fighter's level
 * @param {*} lvl 
 * @returns int
 */

export function getBonus(lvl) {
    return (1 + (lvl === 99 ? 100 : lvl - 1) / 100) ** 2; 
}