import { shuffle, getChance } from '../../utils/random.js';
import { Card } from './card.js';

export class Deck {
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
    deal(hand, options) {
        options = options || {};
        options.amount = options.amount || 1;

        for (let i = 0; i < options.amount; i++) {
            if (!this.cards.length) {
                this.newDeck();
            }

            const card = options.luck && getChance(options.luck / 4)
                ? new Card(0, 4) : this.cards.pop();

            card.down = options.down;
            hand.push(card);
        }
    }
}