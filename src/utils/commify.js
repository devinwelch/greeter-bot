/**
 * Pause before executing a function
 * @param {int} number number to stringify with commas
 * @returns string
 */

export function commify(number) {
    const numberString = String(number);

    if (number >= 1000000000000000000000000000000000000000000000000000000000000000) {
        return `${numberString.substring(0,1)}.${numberString.substring(2,5)} Vigintillion`;
    }
    else if (number >= 1000000000000000000000000000000000000000000000000000000000000) {
        return `${numberString.substring(0,1)}.${numberString.substring(2,5)} Novemdecillion`;
    }
    else if (number >= 1000000000000000000000000000000000000000000000000000000000) {
        return `${numberString.substring(0,1)}.${numberString.substring(2,5)} Octodecillion`;
    }
    else if (number >= 1000000000000000000000000000000000000000000000000000000) {
        return `${numberString.substring(0,1)}.${numberString.substring(2,5)} Septendecillion`;
    }
    else if (number >= 1000000000000000000000000000000000000000000000000000) {
        return `${numberString.substring(0,1)}.${numberString.substring(2,5)} Sexdecillion 🥵`;
    }
    else if (number >= 1000000000000000000000000000000000000000000000000) {
        return `${numberString.substring(0,1)}.${numberString.substring(2,5)} Quindecillion`;
    }
    else if (number >= 1000000000000000000000000000000000000000000000) {
        return `${numberString.substring(0,1)}.${numberString.substring(2,5)} Quattordecillion`;
    }
    else if (number >= 1000000000000000000000000000000000000000000) {
        return `${numberString.substring(0,1)}.${numberString.substring(2,5)} Tredecillion`;
    }
    else if (number >= 1000000000000000000000000000000000000000) {
        return `${numberString.substring(0,1)}.${numberString.substring(2,5)} Duodecillion`;
    }
    else if (number >= 1000000000000000000000000000000000000) {
        return `${numberString.substring(0,1)}.${numberString.substring(2,5)} Undecillion`;
    }
    else if (number >= 1000000000000000000000000000000000) {
        return `${numberString.substring(0,1)}.${numberString.substring(2,5)} Decillion`;
    }
    else if (number >= 1000000000000000000000000000000) {
        return `${numberString.substring(0,1)}.${numberString.substring(2,5)} Nonillion`;
    }
    else if (number >= 1000000000000000000000000000) {
        return `${numberString.substring(0,1)}.${numberString.substring(2,5)} Octillion`;
    }
    else if (number >= 1000000000000000000000000) {
        return `${numberString.substring(0,1)}.${numberString.substring(2,5)} Septillion`;
    }
    else if (number >= 1000000000000000000000) {
        return `${numberString.substring(0,1)}.${numberString.substring(2,5)} Sextillion 🤤`;
    }
    else if (number >= 1000000000000000000) {
        return `${numberString.substring(0,1)}.${numberString.substring(2,5)} Quintillion`;
    }
    else if (number >= 1000000000000000) {
        return `${numberString.substring(0,1)}.${numberString.substring(2,5)} Quadrillion`;
    }  

    return number.toLocaleString('en-US');
}