import { getData } from '../data/getData.js';
import { getChance } from '../utils/random.js';
import { selectRandom } from '../utils/random.js';
import { updateData } from '../data/updateData.js';
import { sendInvite } from '../utils/sendInvite.js';
import { databaseError } from '../utils/databaseError.js';
import { MessageActionRow, MessageButton } from 'discord.js';

const columns = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣'];
const blank = '⚪', red = '🔴', yellow = '🟡';

export default {
    name: 'connect',
    description: 'Play Connect 4 with a friend',
    category: 'fun',
    options: [{
        type: 6, //USER
        name: 'user',
        description: 'A friend or foe',
        required: true
    },
    {
        type: 4, //INTEGER
        name: 'wager',
        description: 'How many GBPs to bet',
        required: false
    }],
    async execute(client, db, interaction) {
        //interaction.deferReply();

        const wager = interaction.options.getInteger('wager') ?? 0;
        const challenger = interaction.user;
        const target = interaction.options.getUser('user');

        if (target === client.user) {
            return interaction.reply("I'm not smart enough to play... *yet*.");
        }
        else if (target === challenger) {
            return interaction.reply('Quit playing with yourself!');
        }
        else if (wager < 0) {
            return interaction.reply('Make it a real challenge.');
        }

        const data = await getData(db, [challenger.id, target.id]);
        if (!data) {
            return databaseError(interaction, 'gbp');
        }

        const challengerData = data.find(d => d.UserID === challenger.id);
        const targetData     = data.find(d => d.UserID === target.id);

        //challenger or target cannot match wager
        if (wager) {
            if (challengerData.GBPs < wager) {
                return interaction.reply(`Hang on there, slick! You only have ${challengerData.GBPs} GBPs!`);
            }
            if (targetData.GBPs < wager) {
                return interaction.reply(`${target.displayName} can't match that bet!`);
            }
        }

        //send duel invite
        if (await sendInvite(client, interaction, challenger, target, 'Connect Four', wager)) {
            start(db, interaction, challenger, target, wager);
        }
    }
};

function start(db, interaction, challenger, target, wager) {
    const board = new Board();
    let challengerTurn = getChance(50);
    
    //set up buttons
    const buttons = [
        new MessageActionRow()
            .addComponents([
                getButton('1', '1️⃣'),
                getButton('2', '2️⃣'),
                getButton('3', '3️⃣'),
                getButton('4', '4️⃣')
            ]),
        new MessageActionRow()
            .addComponents([
                getButton('5', '5️⃣'),
                getButton('6', '6️⃣'),
                getButton('7', '7️⃣'),
                getButton('random', '❔', true)
        ])];

    function getButton(id, emoji, primary=false) {
        return new MessageButton()
            .setCustomId(id)
            .setEmoji(emoji)
            .setStyle(primary ? 'PRIMARY' : 'SECONDARY');
    }

    //send game board
    const gameStart = board.getDisplay();
    gameStart.push(`${challengerTurn ? challenger.username : target.username}'s turn ${challengerTurn ? red : yellow}`);
    interaction.editReply({ content: gameStart.join('\n'), components: buttons });

    const filter = buttonInteraction => 
        buttonInteraction.message === interaction.message && (
            (buttonInteraction.user === challenger &&  challengerTurn) ||
            (buttonInteraction.user === target     && !challengerTurn));
    const collector = interaction.channel.createMessageComponentCollector({ filter, idle: 300000 });
    let timeout = true;

    collector.on('collect', async buttonInteraction => {
        let index = parseInt(buttonInteraction.customId);
        if (isNaN(index)) {
            const open = [];
            for (let x=0; x < 7; x++) {
                if (board[x][5] === blank) {
                    open.push(x);
                }
            }
            index = selectRandom(open);
        }
        else {
            index -= 1;
        }

        if (board.place(index, challengerTurn)) {
            challengerTurn = !challengerTurn;
            const text = board.getDisplay();
            const winner = board.checkWin();
            if (winner) {
                text.push(getWinner(db, challenger, target, wager, winner));
                timeout = false;
                collector.stop();
            }
            else {
                text.push(`${challengerTurn ? challenger.username : target.username}'s turn ${challengerTurn ? red : yellow}`);
            }

            if (buttonInteraction.customId === 'random') {
                text[text.length - 1] += '⁉️';
            }

            await buttonInteraction.update({ content: text.join('\n'), components: timeout ? null : [] });
        }
    });

    collector.on('end', () => {
        //check time out loss
        if (timeout) {
            const winner = challengerTurn ? target : challenger;
            const loser  = challengerTurn ? challenger : target;

            const text = board.getDisplay();
            text.push(`**${loser.username} took too long to decide; ${winner.username} wins ${wager} GBPs.**`);
            interaction.editReply({ content: text.join('\n'), components: [] });

            updateData(db, winner, { gbps: wager, xp: 150 });
            updateData(db, loser, { gbps: -wager });
            
        }
    });    
}

function getWinner(db, challenger, target, wager, win) {
    if (win === 'tie') {
        return "**It's a tie!**";
    }

    let winner;
    let loser;

    if (win === red) {
        winner = challenger;
        loser = target;
    }
    else {
        winner = target;
        loser = challenger;
    }

    updateData(db, winner, { gbps: wager, xp: 300 });
    updateData(db, loser, { gbps: -wager });

    return `**${winner.username} wins ${wager} GBPs from ${loser.username}!**`;
}

class Board {
    constructor() {
        for(var x = 0; x < 7; x++) {
            for(var y = 0; y < 6; y++) {
                if (this[x]) {
                    this[x][y] = blank;
                }
                else {
                    this[x] = { 0: blank };
                }
            }
        }
    }

    place(x, redTurn) {
        for (var y = 0; y < 6; y ++) {
            if (this[x][y] === blank) {
                this[x][y] = redTurn ? red : yellow;
                return true;
            }
        }

        return false;
    }

    checkWin() {
        //check horizontals
        for (var x = 0; x < 4; x++) {
            for (var y = 0; y < 6; y++) {
                if (this[x][y] !== blank &&
                    this[x][y] === this[x+1][y] &&
                    this[x][y] === this[x+2][y] &&
                    this[x][y] === this[x+3][y])
                {
                    return this[x][y];
                }
            }
        }

        //check verticals
        for (x = 0; x < 7; x++) {
            for (y = 0; y < 3; y++) {
                if (this[x][y] !== blank &&
                    this[x][y] === this[x][y+1] &&
                    this[x][y] === this[x][y+2] &&
                    this[x][y] === this[x][y+3])
                {
                    return this[x][y];
                }
            }
        }

        //check diagonal down-right
        for (x = 0; x < 4; x++) {
            for (y = 3; y < 7; y++) {
                if (this[x][y] !== blank &&
                    this[x][y] === this[x+1][y-1] &&
                    this[x][y] === this[x+2][y-2] &&
                    this[x][y] === this[x+3][y-3])
                {
                    return this[x][y];
                }
            }
        }

        //check diagonal down-left
        for (x = 3; x < 7; x++) {
            for (y = 3; y < 7; y++) {
                if (this[x][y] !== blank &&
                    this[x][y] === this[x-1][y-1] &&
                    this[x][y] === this[x-2][y-2] &&
                    this[x][y] === this[x-3][y-3])
                {
                    return this[x][y];
                }
            }
        }

        //check tie
        for (x = 0; x < 7; x++) {
            for (y = 0; y < 6; y++) {
                if (this[x][y] === blank) {
                    //no tie
                    return false;
                }
            }
        }

        return 'tie';
    }

    getDisplay() {
        const message = [columns.join('')];

        for(var y = 5; y >= 0; y--) {
            const row = [];
            for(var x = 0; x < 7; x++) {
                row.push(this[x][y]);
            }
            message.push(row.join(''));
        }

        message.push(columns.join(''));

        return message;
    }
}