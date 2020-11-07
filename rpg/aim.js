module.exports.aim = function(player, board, direction) {
    switch(player.weapon.type) {
        case 'bag':         return bag(player, board, direction); 
        case 'kamehameha':  return kamehameha(player, board, direction); 
        case 'daggers':     return daggers(player, board, direction); 
        case 'battleaxe':   return battleaxe(player, board, direction); 
        case 'warhammer':   return warhammer(player, board, direction); 
        case 'fiddle':      return fiddle(player, board, direction); 
        case 'bow':         return bow(player, board, direction); 
        case 'fists':       return fists(player, board, direction); 
        case 'sword':       return sword(player, board, direction); 
        case 'scythe':      return scythe(player, board, direction); 
        default:            return fists(player, board, direction);
    }
};

//first hit in 1-4 range
//+1 spider if adjacent, -1 spider at max range
function bag(player, board, direction) {
    let x = player.x;
    let y = player.y;
    let target;
    let distance;
    
    for (let i = 1; i <= 4; i++) {
        if (direction === '⬅️' && check(board, x - i, y)) target = board[x-i][y].occupied;
        if (direction === '⬆️' && check(board, x, y - i)) target = board[x][y-i].occupied;
        if (direction === '⬇️' && check(board, x, y + i)) target = board[x][y+i].occupied;
        if (direction === '➡️' && check(board, x + i, y)) target = board[x+i][y].occupied;

        if (target) {
            distance = i;
            break;
        }
    }

    return { targets: [target], modifiers: [[1, 0, 0, -1][distance - 1]] };
}

//AOE 3 in line
function kamehameha(player, board, direction) {
    let x = player.x;
    let y = player.y;
    const targets = [];
    
    for (let i = 1; i <= 3; i++) {
        if (direction === '⬅️') add(targets, board, x - i, y);
        if (direction === '⬆️') add(targets, board, x, y - i);
        if (direction === '⬇️') add(targets, board, x, y + i);
        if (direction === '➡️') add(targets, board, x + i, y);
    }

    return targets;
}

//AOE 2 forward, 2 backward
function daggers(player, board, direction) {
    let x = player.x;
    let y = player.y;
    const targets = [];
    
    for (let i = 1; i <= 2; i++) {
        if (direction === '⬅️' || direction === '➡️') {
            add(targets, board, x + i, y);
            add(targets, board, x - i, y);
        }
        else {
            add(targets, board, x, y + i);
            add(targets, board, x, y - i);
        }
    }

    return targets;
}

//◧▢ 
//⬚▢ AOE, 50% dmg on sides
//◧▢
function battleaxe(player, board, direction) {
    let x = player.x;
    let y = player.y;
    const targets = [];
    const modifiers = [];
    
    if (direction === '⬅️' || direction === '➡️') {
        if (direction === '⬅️') {
            add(targets, board, x - 1, y, modifiers, 1);
            add(targets, board, x - 1, y + 1, modifiers, 1);
            add(targets, board, x - 1, y - 1, modifiers, 1);
        }
        else {
            add(targets, board, x + 1, y, modifiers, 1);
            add(targets, board, x + 1, y + 1, modifiers, 1);
            add(targets, board, x + 1, y - 1, modifiers, 1);
        }

        add(targets, board, x, y - 1, modifiers, 0.5);
        add(targets, board, x, y + 1, modifiers, 0.5);
    }
    else {
        if (direction === '⬆️') {
            add(targets, board, x, y - 1, modifiers, 1);
            add(targets, board, x + 1, y - 1, modifiers, 1);
            add(targets, board, x - 1, y - 1, modifiers, 1);
        }
        else {
            add(targets, board, x, y + 1, modifiers, 1);
            add(targets, board, x + 1, y + 1, modifiers, 1);
            add(targets, board, x - 1, y + 1, modifiers, 1);
        }

        add(targets, board, x + 1, y, modifiers, 0.5);
        add(targets, board, x - 1, y, modifiers, 0.5);
    }

    return { targets: targets, modifiers: modifiers };
}

//single target
function warhammer(player, board, direction) {
    let x = player.x;
    let y = player.y;
    const targets = [];
    
    if (direction === '⬅️') add(targets, board, x - 1, y);
    if (direction === '⬆️') add(targets, board, x, y - 1);
    if (direction === '⬇️') add(targets, board, x, y + 1);
    if (direction === '➡️') add(targets, board, x + 1, y);

    return targets;
}

//AOE, 4 in line, 100/50/25/0 % crit chance
function fiddle(player, board, direction) {
    let x = player.x;
    let y = player.y;
    const targets = [];
    const modifiers = [];
    const crit = [1, 0.5, 0.25, 0];
    
    for (let i = 1; i <= 4; i++) {
        if (direction === '⬅️') add(targets, board, x - i, y, modifiers, crit[i - 1]);
        if (direction === '⬆️') add(targets, board, x, y - i, modifiers, crit[i - 1]);
        if (direction === '⬇️') add(targets, board, x, y + i, modifiers, crit[i - 1]);
        if (direction === '➡️') add(targets, board, x + i, y, modifiers, crit[i - 1]);
    }

    return { targets: targets, modifiers: modifiers };
}

//first hit in 1-4 range
function bow(player, board, direction) {
    let x = player.x;
    let y = player.y;
    const targets = [];
    
    for (let i = 1; i <= 4; i++) {
        if (direction === '⬅️') add(targets, board, x - i, y);
        if (direction === '⬆️') add(targets, board, x, y - i);
        if (direction === '⬇️') add(targets, board, x, y + i);
        if (direction === '➡️') add(targets, board, x + i, y);

        if (targets.length) {
            break;
        }
    }

    return targets;
}

//AOE, 4 adjacent
function fists(player, board) {
    let x = player.x;
    let y = player.y;
    const targets = [];

    add(targets, board, x - 1, y);
    add(targets, board, x + 1, y);
    add(targets, board, x, y - 1);
    add(targets, board, x, y + 1);

    return targets;
}

// ▢ 
//⬞▢▢ AOE
// ▢
function sword(player, board, direction) {
    let x = player.x;
    let y = player.y;
    const targets = [];
    
    switch (direction) {
        case '⬅️': 
            add(targets, board, x - 1, y);
            add(targets, board, x - 1, y + 1);
            add(targets, board, x - 1, y - 1);
            add(targets, board, x - 2, y);
            break;
        case '➡️':
            add(targets, board, x + 1, y);
            add(targets, board, x + 1, y + 1);
            add(targets, board, x + 1, y - 1);
            add(targets, board, x + 2, y);
            break;
        case '⬆️':
            add(targets, board, x, y - 1);
            add(targets, board, x + 1, y - 1);
            add(targets, board, x - 1, y - 1);
            add(targets, board, x, y - 2);
            break;
        case '⬇️':
            add(targets, board, x, y + 1);
            add(targets, board, x + 1, y + 1);
            add(targets, board, x - 1, y + 1);
            add(targets, board, x, y + 2);
            break;
    }

    return targets;
}

//    ▢ 
//⬞▢▢   AOE
function scythe(player, board, direction) {
    let x = player.x;
    let y = player.y;
    const targets = [];
    
    switch (direction) {
        case '⬅️': 
            add(targets, board, x - 1, y);
            add(targets, board, x - 2, y);
            add(targets, board, x - 3, y + 1);
            break;
        case '➡️':
            add(targets, board, x + 1, y);
            add(targets, board, x + 2, y);
            add(targets, board, x + 3, y - 1);
            break;
        case '⬆️':
            add(targets, board, x, y - 1);
            add(targets, board, x, y - 2);
            add(targets, board, x - 1, y - 3);
            break;
        case '⬇️':
            add(targets, board, x, y + 1);
            add(targets, board, x, y + 2);
            add(targets, board, x + 1, y + 3);
            break;
    }

    return targets;
}

function add(targets, board, x, y, modifiers, mod) {
    if (check(board, x, y)) {
        targets.push(board[x][y].occupied);
        if (modifiers) {
            modifiers.push(mod);
        }
    }
}

function check(board, x, y) {
    if (x > 0 && 
        x <= board.width && 
        y > 0 && 
        y <= board.height)
    {
        if (board[x][y].isEnemy()) {
            board[x][y].temp = '🟥';
            return true;
        }
        else {
            board[x][y].temp = '🟩';
        }
    }

    return false;
}