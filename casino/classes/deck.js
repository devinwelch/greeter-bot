const { shuffle } = require('../../utils');
const { Card } = require('./card');

module.exports.Deck = class {
    constructor() {
        this.newDeck();
    }

    newDeck() {
        this.cards = [];

        for (let rank = 1; rank <= 13; rank++) {
            for(let suit = 0; suit < 4; suit++) {
                this.cards.push(new Card(rank, suit));
            }
        }

        shuffle(this.cards);
    }

    //hand is array of cards
    deal(hand, amount = 1) {
        for (let i = 0; i < amount; i++) {
            if (!this.cards.length) {
                this.newDeck();
            }

            hand.push(this.cards.pop());
        }
    }
};