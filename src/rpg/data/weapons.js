export default {
    //Bag of Spiders
    bag: {
        type: 'bag',
        name: [
            'Bag of Spiders'
        ],
        icons: [
            '882088859414982666',
            '882089227154776084',
            '882089394843041842',
            '882089523364892722',
            '882089688041656370'
        ],
        description: 'Throw a bunch of spiders at your foe! Spiders stack and deal dmg each turn.',
        upgrade: 'Swarm: increase minimum thrown spiders by +1 per skill point!',
        win: ':l was devoured by spiders!',
        low: 1,
        high: 1,
        spidermin: 1,
        spidermax: 9,
        cost: 1,
        weapon: true
    },

    //Battleaxe
    battleaxe: {
        type: 'battleaxe',
        name: [
            'Battleaxe'
        ],
        icons: [
            '882088871289036811',
            '882089256892375140',
            '882089404255047690',
            '882089537864605746',
            '882089699500490763'
        ],
        description: 'Increases 1% dmg per 1% max hp missing!',
        upgrade: "Berserker's rage: increase zerk dmg bonus 0.25% per skill point!",
        win: ":w split :l's skull!",
        low: 10,
        high: 12,
        'zerk': 1,
        cost: 1,
        weapon: true,
        steel: true
    },

    //Bow and Arrow
    bow: {
        type: 'bow',
        name: [
            'Bow and Arrow'
        ],
        icons: [
            '882088884433985556',
            '882089269546586253',
            '882089413126021140',
            '882089548656554004',
            '882089709843677225'
        ],
        description: 'Always attacks first!',
        upgrade: 'Multishot: +12% chance per skill point to loose an extra arrow!',
        win: ':w 360 no-scoped :l!',
        low: 5,
        high: 25,
        priority: 1,
        cost: 0,
        weapon: true
    },

    //Twin Daggers
    daggers: {
        type: 'daggers',
        name: [
            'Daggers'
        ],
        icons: [
            '882089003149586433',
            '882089279998799892',
            '882089424404512808',
            '882089559414964304',
            '882089722682429461'
        ],
        description: 'Hits twice!',
        upgrade: 'Poisoned blades: 20% chance poison enemy dealing 5% max HP each turn, stacking +1 times per skill point!',
        win: ':w sliced and diced :l!',
        low: 1,
        high: 15,
        hits: 2,
        cost: 1,
        weapon: true,
        steel: true
    },

    //Fiddle
    fiddle: {
        type: 'fiddle',
        name: [
            'Fiddle'
        ],
        icons: [
            '882089020581109780',
            '882089294288793642',
            '882089433195765790',
            '882089578004099082',
            '882089732052500541'
        ],
        description: '7% base chance to insta-kill!',
        upgrade: 'Demonic power: increase instakill chance +1% per skill point!',
        win: "He told you once, you son of a bitch, :w is the best that's ever been!",
        low: 1,
        high: 25,
        instakill: 7,
        cost: 1,
        weapon: true
    },

    //Fists
    fists: {
        type: 'fists',
        name: [
            'Fists'
        ],
        icons: [
            '882089079737573426',
            '882089303851798599',
            '882089442347720715',
            '882089590230487061',
            '882089742634721321'
        ],
        description: "Ol' reliable!",
        upgrade: 'Sucker punch: at the start of the match, hit for +40% dmg per skill point!',
        
        win: ':w beat :l to a pulp!',
        low: 1,
        high: 30,
        cost: 1,
        weapon: true
    },

    //Kamehameha
    kamehameha: {
        type: 'kamehameha',
        name: [
            'Kamehameha'
        ],
        icons: [
            '882089097617895424',
            '882089317206487142',
            '882089458621644870',
            '882089613806669865',
            '882089756979240981'
        ],
        description: 'Sits around for 5 episodes before unleashing a devastating attack!',
        upgrade: 'Hyperbolic time chamber: +25% chance per skill point to skip first phase!',
        win: ':w triumphs over :l, but is this the end of their conflict? Find out next time...',
        sequence:[' is gathering energy', ': ka', ': Me', ': HA', ': *ME*', ': HA'],
        low: 100,
        high: 120,
        cost: 2,
        weapon: true
    },

    //Scythe
    scythe: {
        type: 'scythe',
        name: [
            'Scythe'
        ],
        icons: [
            '882089115582095380',
            '882089337318174800',
            '882089470759948289',
            '882089626695770183',
            '882089773735505932'
        ],
        description: '7% base chance to insta-kill!',
        upgrade: 'Lifesteal: heal for +10% of dmg dealt per skill point!',
        win: ":w harvested :l's soul!",
        low: 7,
        high: 20,
        instakill: 7,
        weapon: true,
        steel: true
    },

    //Sword
    sword: {
        type: 'sword',
        name: [
            'Sword'
        ],
        icons: [
            '882089133948928040',
            '882089351075475506',
            '882089502540193824',
            '882089666139000843',
            '882089789678030878'
        ],
        description: '30x cold-rolled American steel!',
        upgrade: 'Parry: reflect +8% of dmg taken per skill point!',
        win: ':w eviscerated :l!',
        low: 12,
        high: 20,
        cost: 1,
        weapon: true,
        steel: true
    },

    //Warhammer
    warhammer: {
        type: 'warhammer',
        name: [
            'Warhammer'
        ],
        icons: [
            '882089147802742864',
            '882089362584662096',
            '882089512543608852',
            '882089678273151036',
            '882089805666730005'
        ],
        description: 'Hits second, requires wind-up between swings!',
        upgrade: 'Hammer smashed face: +5% stun chance per skill point!',
        win: ":w smashed :l's face!",
        low: 20,
        high: 50,
        hits: 1,
        slow: true,
        priority: -1,
        cost: 2,
        weapon: true,
        steel: true
    }
};