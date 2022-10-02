/**
 * Pause before executing a function
 * @param {int} t time in millisecond
 * @param {function} v function to resolve on timeout
 * @returns Promise
 */

export function delay(t, v) {
    return new Promise(function(resolve) { 
        setTimeout(resolve.bind(null, v), t);
    });
}