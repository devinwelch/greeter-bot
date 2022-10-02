/**
 * Gets random integer in range 0/min through max
 * @returns int
 */
export function getRandom(x, y) {
    let min;
    let max;

    if (y) {
        min = x;
        max = y;
    }
    else {
        min = 0;
        max = x;
    }

    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Returns boolean based on percentage chance
 * @param {number} percent number up to 2 decimal places
 * @returns boolean
 */
export function getChance(percent) {
    return getRandom(1, 10000) <= percent * 100;
}

/**
 * Gets a specified number of random elements from an array
 * @param {*} amount number of elements to select
 * @returns element or element[]
 */
export function selectRandom(array, amount) {
    if (!amount) {
        return array[Math.floor(Math.random() * array.length)];
    }

    if (amount > array.length) {
        return false;
    }
    
    const selected = [];
    const arr = Array.from(array);
    
    for(let i = 0; i < amount; i++) {
        const selection = getRandom(arr.length - 1);
        selected.push(arr[selection]);
        arr.splice(selection, 1);
    }

    return selected;
}

/**
 * Shuffles an array in place
 * @returns void
 */
export function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = getRandom(i);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}