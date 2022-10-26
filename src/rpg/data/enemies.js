export default {
    creatures: {
        alien:    { emoji: '👽', literal: 'a :adj alien',    dmg: 0,  hp: 0 },
        badger:   { emoji: '🦡', literal: 'a :adj badger',   dmg: 0,  hp: 20, xp: 50 },
        bear:     { emoji: '🐻', literal: 'a :adj bear',     dmg: 0,  hp: 30, xp: 50 },
        bees:     { emoji: '🐝', literal: ':adj bees',       dmg: 0,  hp: -40, hits: 5, xp: 100 },
        boar:     { emoji: '🐗', literal: 'a :adj boar',     dmg: 0,  hp: 0, speed: 0.5, xp: 50 },
        child:    { emoji: '👦', literal: 'a :adj child',    dmg: 0,  hp: -30, xp: -100 },
        crab:     { emoji: '🦀', literal: '2 :adj crabs',    dmg: 0,  hp: 0, hits: 2, xp: 50 },
        devil:    { emoji: '😈', literal: 'the :adj devil',  dmg: 5,  hp: 40, xp: 300 },
        doctor:   { emoji: '👩‍⚕️', literal: 'a :adj doctor',   dmg: 0,  hp: 0 },
        dragon:   { emoji: '🐉', literal: 'a :adj dragon',   dmg: 10, hp: 0, xp: 200 },
        fly:      { emoji: '🪰',  literal: 'a :adj fly',      dmg: 0,  hp: -50, evasive: true },
        frogs:    { emoji: '🐸', literal: ':adj frogs',      dmg: 0,  hp: 0, hits: 3, xp: 100 },
        gator:    { emoji: '🐊', literal: 'a :adj gator',    dmg: 0,  hp: 0 },
        ghost:    { emoji: '👻', literal: 'a :adj ghost',    dmg: 0,  hp: 0 },
        goblin:   { emoji: '👺', literal: 'a :adj goblin',   dmg: 0,  hp: 0 },
        gorilla:  { emoji: '🦍', literal: 'a :adj gorilla',  dmg: 5,  hp: 10, xp: 100 },
        gun:      { emoji: '🔫', literal: 'a :adj gun',      dmg: 20, hp: -20, xp: 200 },
        lion:     { emoji: '🦁', literal: 'a :adj lion',     dmg: 5,  hp: 0, xp: 150 },
        magician: { emoji: '🕴🏻',  literal: 'a :adj magician', dmg: 0,  hp: 30, xp: 100, tricky: true },
        monke:    { emoji: '🦧', literal: 'le :adj monke',   dmg: 0,  hp: 0 },
        monkey:   { emoji: '🐵', literal: 'a :adj monkey',   dmg: 0,  hp: -10, speed: 0.5, xp: 50 },
        ogre:     { emoji: '👹', literal: 'a :adj ogre',     dmg: 20,  hp: 20, speed: -2, slow: true, xp: 100 },
        penguin:  { emoji: '🐧', literal: 'a :adj penguin',  dmg: 0,  hp: 0, speed: -1 },
        pumpkin:  { emoji: '🎃', literal: 'a :adj pumpkin',  dmg: 5,  hp: -10, xp: -10 },
        robot:    { emoji: '🤖', literal: 'a :adj robot',    dmg: 0,  hp: 20, xp: 50 },
        scorpion: { emoji: '🦂', literal: 'a :adj scorpion', dmg: 0,  hp: 0 },
        shadow:   { emoji: '👤', literal: 'a :adj shadow',   dmg: 0,  hp: -10, xp: 200, shadowy: true },
        shark:    { emoji: '🦈', literal: 'a :adj shark',    dmg: 0,  hp: 0 },
        skeleton: { emoji: '💀', literal: 'a :adj skeleton', dmg: 0,  hp: 0 },
        sloth:    { emoji: '🦥', literal: 'a :adj sloth',    dmg: 0,  hp: 0, speed: -1, xp: -25 },
        snail:    { emoji: '🐌', literal: 'a :adj snail',    dmg: 0,  hp: 0, speed: -1 },
        snake:    { emoji: '🐍', literal: 'a :adj snake',    dmg: 0,  hp: 0 },
        snowman:  { emoji: '⛄', literal: 'a :adj snowman',  dmg: 0,  hp: 0 },
        spider:   { emoji: '🕷', literal: 'a :adj spider',    dmg: 0,  hp: 0 },
        tiger:    { emoji: '🐯', literal: 'a :adj tiger',    dmg: 0,  hp: 0, speed: 0.5, xp: 100 },
        trex:     { emoji: '🦖', literal: 'a :adj t-rex',    dmg: 5,  hp: 30, xp: 100 },
        turtle:   { emoji: '🐢', literal: 'a :adj turtle',   dmg: 0,  hp: -50, shield: 75, xp: 25, speed: -0.5 },
        unicorn:  { emoji: '🦄', literal: 'a :adj unicorn',  dmg: 5, hp: 50, award: 50, speed: 0.5, xp: 500 },
        vampire:  { emoji: '🧛', literal: 'a :adj vampire',  dmg: 0,  hp: 0, lifesteal: 15 },
        wizard:   { emoji: '🧙‍♂️', literal: 'a :adj wizard',   dmg: 0,  hp: 0 },
        wolf:     { emoji: '🐺', literal: 'a :adj wolf',     dmg: 0,  hp: 0, speed: 0.5, xp: 50 },
        zombie:   { emoji: '🧟', literal: 'a :adj zombie',   dmg: 0,  hp: 0 }
        
    },
    modifiers: {
        bag:          { emoji: '🛍️', literal: 'a bag of candy',   left: true },
        bow:          { emoji: '🏹', literal: 'a bow',            left: true, speed: 1 },
        cyborgArm:    { emoji: '🦾', literal: 'a cyborg arm',     left: true },
        hearingAid:   { emoji: '🦻', literal: 'a hearing aid' },
        fryingPan:    { emoji: '🍳', literal: 'a frying pan',     left: true },
        spoon:        { emoji: '🥄', literal: 'a spoon',          left: true },
        guitar:       { emoji: '🎸', literal: 'a guitar',         musical: true },
        paddle:       { emoji: '🏓', literal: 'a paddle',         left: true },
        racket:       { emoji: '🏸', literal: 'a racket',         left: true },
        hockeyStick:  { emoji: '🏒', literal: 'a hockey stick',   left: true },
        saxaphone:    { emoji: '🎷', literal: 'a saxaphone',      left: true, musical: true },
        flashlight:   { emoji: '🔦', literal: 'a flashlight',     left: true },
        wrench:       { emoji: '🔧', literal: 'a wrench',         left: true },
        hammer:       { emoji: '🔨', literal: 'a hammer',         left: true },
        axe:          { emoji: '🪓', literal: 'an axe',           left: true },
        brick:        { emoji: '🧱', literal: 'a brick',          left: true },
        magnet:       { emoji: '🧲', literal: 'a magnet' },
        bomb:         { emoji: '💣', literal: 'a bomb',           left: true },
        knife:        { emoji: '🔪', literal: 'a knife' },
        cane:         { emoji: '🦯', literal: 'blind',            left: true, adjective: true },
        infection:    { emoji: '🦠', literal: 'infected',         left: true, adjective: true },
        broom:        { emoji: '🧹', literal: 'a broom',          left: true },
        scissors:     { emoji: '✂️', literal: 'scissors',         left: true },
        fire:         { emoji: '🔥', literal: 'flaming',          left: true, adjective: true },
        boombox:      { emoji: '📻', literal: 'a boombox',        left: true, musical: true },
        pen:          { emoji: '🖊', literal: 'a pen',            left: true },
        pickaxe:      { emoji: '⛏', literal: 'a pickaxe',        left: true }
    },
    special: {
        trumpet:  { emoji: '🎺', literal: 'a trumpet',    enemy: '💀' },
        fiddle:   { emoji: '🎻', literal: 'a fiddle',     enemy: '😈', musical: true, chance: 75 },
        gun:      { emoji: '🔫', literal: 'a gun',        enemy: '🐌' , left: true, banned: true },
        balloon:  { emoji: '🎈', literal: 'a balloon',    enemy: '👦' , left: true },
        rainbow:  { emoji: '🏳️‍🌈', literal: 'gay',          enemy: '🐸' , left: true, adjective: true, musical: true },
        stinky:   { emoji: '💩', literal: 'stinky',       enemy: '🦧' , left: true, adjective: true, musical: true, chance: 75 },
        hair:     { emoji: '💇', literal: 'human hair',   enemy: '🤖' , musical: true },
        vaccine:  { emoji: '💉', literal: 'a vaccine',    enemy: '👩‍⚕️', chance: 75, banned: true },
        metal:    { emoji: '⚙',  literal: 'better metal', enemy: '🐍', left: true, adjective: true, musical: true },
        child:    { emoji: '🧒', literal: 'a child',      enemy: '🦍', chance: 25, banned: true },
        magic:    { emoji: '🪄', literal: 'magic',         enemy: '🕷', left: true, chance: 20, adjective: true, musical: true, banned: true }
    }
};