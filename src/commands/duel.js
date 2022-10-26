import { getData } from '../data/getData.js';
import { Human } from '../rpg/classes/human.js';
import { fight, display } from '../rpg/fight.js';
import { updateData } from '../data/updateData.js';
import { sendInvite } from '../utils/sendInvite.js';
import { databaseError } from '../utils/databaseError.js';
import { getRandom, getChance } from '../utils/random.js';

export default {
    name: 'duel',
    description: 'Duel another user',
    category: 'rpg',
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
        const user = interaction.options.getUser('user');
        const wager = interaction.options.getInteger('wager');
        let challenger = interaction.user;
        let target = user;

        //challenger thinks he's funny
        if (target === client.user) {
            return client.commands.get('raid').execute(client, db, interaction);
        }
        else if (target === challenger) {
            return interaction.reply('Quit playing with yourself!');
        }

        //check data
        const data = await getData(db, [challenger.id, target.id]);
        if (!data) {
            return databaseError(interaction, 'gbp');
        }
        const [challengerData, targetData] = data;

        //challenger or target cannot match wager
        if (wager) {
            if (challengerData.GBPs < wager) {
                return interaction.reply(`Hang on there, slick! You only have ${challengerData.GBPs} GBPs!`);
            }
            if (targetData.GBPs < wager) {
                return interaction.reply(`${target.displayName} can't match that bet!`);
            }
        }

        //send invite and await response
        if (!(await sendInvite(client, interaction, challenger, target, 'a duel', wager))) {
            return;
        }

        //user to member
        challenger = interaction.member;
        target = interaction.guild.members.resolve(user);

        //chance to play duel theme if both members in voice
        const voiceChannel = challenger.voice.channel;
        if (voiceChannel && voiceChannel === target.voice.channel && getChance(25)) {
            //playSong(client, voiceChannel, 'duel.mp3'); TODO
        }

        //initialize fighters
        challenger = new Human(challenger, challengerData, db);
        target = new Human(target, targetData, db);
        challenger.opponents = [target];
        target.opponents = [challenger];
        const party = [challenger, target];

        //buff sequence weapons if opponent is infected
        challenger.turn = target.infected ? getRandom(1) : 0;
        target.turn = challenger.infected ? getRandom(1) : 0;

        //ready message
        const message = await interaction.fetchReply();

        //start the duel
        let actions = [`${target.name} accepted ${challenger.name}'s challenge! ${wager || 'No'} GBPs are on the line.`];
        actions = await fight(client, party, message, actions);

        //determine winner
        const winner = party.find(fighter => fighter.hp > 0);
        const loser = party.find(fighter => fighter !== winner);

        //award GBPs
        if (winner) {
            const xp = Math.round(200 * loser.bonus);
            updateData(db, winner.member.user, { gbps: wager, xp: xp });
            updateData(db, loser.member.user, { gbps: -wager });

            actions.push(`${winner.name} wins ${wager ? `${wager} GBPs and `: ''}${xp} XP!`);
        }
        //tie
        else {
            actions.push(`**It's a tie...${wager ? ' No GBPs are awarded.' : ''}**`);
        }

        display(client, message, actions, party, actions.length - 1, null, []);
    }
};