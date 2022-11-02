/**
 * Given player hand (hole) and community cards, returns highest value hand possible. Value given in array for subsequent sorting.
 * @param hole Card[2]
 * @param community Card[5]
 * @returns \{ name<string>, value<int[]>}
 */

export function getHoldem(hole, community) {
    const all = community.concat(hole);

    const a = all.length;
    let highest = { value: [-1] };

    for(let i = 0; i < a - 4; i++) {
        for(let j = i + 1; j < a - 3; j++) {
            for(let k = j + 1; k < a - 2; k++) {
                for(let l = k + 1; l < a - 1; l++) {
                    for(let m = l + 1; m < a; m++) {
                        const hand = holdem([all[i], all[j], all[k], all[l], all[m]]);
                        if (compare(highest, hand)) {
                            highest = hand;
                        }
                    }
                }
            }
        }
    }

    return highest;

    //compare 2 hands
    function compare(a, b) {
        for(let i = 0; i < a.value.length; i++) {
            if (a.value[i] === b.value[i]) {
                continue;
            }

            return b.value[i] > a.value[i];
        }
    }
}

//get value of hand of 5
function holdem(hand) {
    /*
        9: Royal Flush
        8: Straight Flush
        7: Four of a Kind
        6: Full House
        5: Flush
        4: Straight
        3: Three of a Kind
        2: Two Pair
        1: Pair
        0: High Card
    */

    const value = [];
    let name;

    hand.sort((a, b) => a.getRank() - b.getRank());

   const o4 = ofAKind(4);
   const o3 = ofAKind(3);
   const o2 = ofAKind(2);

    if (isStraight()) {
        if (isFlush()) {
            if (hand[4].getRank() === 14) {
                name = 'Royal Flush';
                value.push(9);
            }
            else {
                name = 'Straight Flush';
                value.push(8);
            }
        }
        else {
            name = 'Straight';
            value.push(4);
        }
        value.push(hand[4].getRank());
    }
    else if (o4) {
        name = 'Four of a Kind';
        value.push(7, o4);
    }
    else if (o3 && o2) {
        name = 'Full House';
        value.push(6, o3);
    }
    else if (isFlush()) {
        name = 'Flush';
        value.push(
            5,
            hand[4].getRank(),
            hand[3].getRank(),
            hand[2].getRank(),
            hand[1].getRank(),
            hand[0].getRank()
        );
    }
    else if (o3) {
        name = 'Three of a Kind';
        value.push(3, o3);
    }
    else if ((new Set(hand.map(card => card.getRank()))).size === 3) {
        let nonpair;
        const pairs = new Set();
        hand.forEach(card => {
            if (hand.filter(c => c.getRank() === card.getRank()).length === 2) {
                pairs.add(card.getRank());
            }
            else {
                nonpair = card.getRank();
            }
        });

        name = 'Two Pair';
        value.push(
            2,
            Math.max(...pairs),
            Math.min(...pairs),
            nonpair
        );
    }
    else if (o2) {
        const nonpair = hand.filter(card => card.getRank() !== o2);

        name = 'Pair';
        value.push(
            1,
            o2,
            nonpair[2].getRank(),
            nonpair[1].getRank(),
            nonpair[0].getRank()
        );
    }
    else {
        name = 'High Card';
        value.push(
            0,
            hand[4].getRank(),
            hand[3].getRank(),
            hand[2].getRank(),
            hand[1].getRank(),
            hand[0].getRank()
        );
    }

    return { name: name, value: value };

    function isStraight() {
        const r = hand.map(card => card.getRank());

        return  r[0] === r[1] - 1 &&
                r[1] === r[2] - 1 &&
                r[2] === r[3] - 1 &&
                (
                    r[3] === r[4] - 1 ||
                    r[4] === 14 && r[0] === 2
                );
    }

    function isFlush() {
        return hand.every(card => card.suit === hand[0].suit);
    }

    function ofAKind(amount) {
        for(let i = 0; i < hand.length; i++) {
            if (hand.filter(c => c.getRank() === hand[i].getRank()).length === amount) {
                return hand[i].getRank();
            }
        }

        return false;
    }
}