const { shuffle } = require('../../utils');
const { Card } = require('./card');

module.exports.Deck = class {
    constructor(count) {
        this.newDeck(count);
    }

    newDeck(count = 1) {
        this.cards = [];

        for (let deck = 0; deck < count; deck++) {
            for (let rank = 1; rank <= 13; rank++) {
                for(let suit = 0; suit < 4; suit++) {
                    this.cards.push(new Card(rank, suit));
                }
            }
        }
        
        shuffle(this.cards);
    }

    //hand is array of cards
    deal(hand, amount = 1, down = false) {
        for (let i = 0; i < amount; i++) {
            if (!this.cards.length) {
                this.newDeck();
            }

            const card = this.cards.pop();
            card.down = down;
            hand.push(card);
        }
    }
};