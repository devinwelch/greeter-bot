module.exports.Action = class {
    constructor(text, turn, party, delay) {
        this.text = text;
        this.turn = turn;
        this.delay = delay;
        
        if (party) {
            this.setHP(party);
        }
    }

    setHP(party) {
        this.hp = {};
        party.forEach(fighter => this.hp[fighter.position] =
            {
                hp: fighter.hp,
                shield: fighter.shield > 0
            }
        );
    }

    toString(tabs = 2) {
        return '\t'.repeat(tabs * this.turn) + this.text; 
    }
};