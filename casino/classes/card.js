module.exports.Card = class {
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

    top(client, config) {
        const emoji = client.emojis.resolve(this.down ? config.ids.cardTop : config.ids.ranks[this.rank]);
        return emoji.toString();
    }

    bot(client, config) {
        const emoji = client.emojis.resolve(this.down ? config.ids.cardBottom : config.ids.suits[this.suit]);
        return emoji.toString();
    }
};