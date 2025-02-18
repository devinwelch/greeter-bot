/**
 * Pause before executing a function
 * @param {int} number number to stringify with commas
 * @returns string
 */

export function commify(number) {
    const abs = Math.abs(number);

    if (abs >= Math.pow(10,63)) {
        return `${(number / Math.pow(10,63)).toFixed(3)} Vigintillion`;
    }
    else if (abs >= Math.pow(10,60)) {
        return `${(number / Math.pow(10,60)).toFixed(3)} Novemdecillion`;
    }
    else if (abs >= Math.pow(10,57)) {
        return `${(number / Math.pow(10,57)).toFixed(3)} Octodecillion`;
    }
    else if (abs >= Math.pow(10,54)) {
        return `${(number / Math.pow(10,54)).toFixed(3)} Septendecillion`;
    }
    else if (abs >= Math.pow(10,51)) {
        return `${(number / Math.pow(10,41)).toFixed(3)} Sexdecillion 🥵`;
    }
    else if (abs >= Math.pow(10,48)) {
        return `${(number / Math.pow(10,48)).toFixed(3)} Quindecillion`;
    }
    else if (abs >= Math.pow(10,45)) {
        return `${(number / Math.pow(10,45)).toFixed(3)} Quattordecillion`;
    }
    else if (abs >= Math.pow(10,42)) {
        return `${(number / Math.pow(10,42)).toFixed(3)} Tredecillion`;
    }
    else if (abs >= Math.pow(10,39)) {
        return `${(number / Math.pow(10,39)).toFixed(3)} Duodecillion`;
    }
    else if (abs >= Math.pow(10,36)) {
        return `${(number / Math.pow(10,36)).toFixed(3)} Undecillion`;
    }
    else if (abs >= Math.pow(10,33)) {
        return `${(number / Math.pow(10,33)).toFixed(3)} Decillion`;
    }
    else if (abs >= Math.pow(10,30)) {
        return `${(number / Math.pow(10,30)).toFixed(3)} Nonillion`;
    }
    else if (abs >= Math.pow(10,27)) {
        return `${(number / Math.pow(10,27)).toFixed(3)} Octillion`;
    }
    else if (abs >= Math.pow(10,24)) {
        return `${(number / Math.pow(10,24)).toFixed(3)} Septillion`;
    }
    else if (abs >= Math.pow(10,21)) {
        return `${(number / Math.pow(10,21)).toFixed(3)} Sextillion 🤤`;
    }
    else if (abs >= Math.pow(10,18)) {
        return `${(number / Math.pow(10,18)).toFixed(3)} Quintillion`;
    }
    else if (abs >= Math.pow(10,15)) {
        return `${(number / Math.pow(10,15)).toFixed(3)} Quadrillion`;
    }  

    return number.toLocaleString('en-US');
}