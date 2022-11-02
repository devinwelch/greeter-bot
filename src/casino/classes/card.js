export class Card {
    constructor(rank, suit) {
        this.rank = rank;
        this.suit = suit;
    }

    getRank(aceHigh = true) {
        if (aceHigh && this.rank === 1) {
            return 14;
        }

        return this.rank;
    }

    //for use in blackjack
    getValue() {
        return Math.min(10, this.rank);
    }

    top(client) {
        const emoji = client.emojis.resolve(this.down ? client.ids.emojis.cardTop : client.ids.emojis.ranks[this.rank]);
        return emoji.toString();
    }

    bot(client) {
        const emoji = client.emojis.resolve(this.down ? client.ids.emojis.cardBottom : client.ids.emojis.suits[this.suit]);
        return emoji.toString();
    }
}