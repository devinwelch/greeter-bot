import { v4 } from 'uuid';
import { getData } from '../data/getData.js';
import { Human } from '../rpg/classes/human.js';
import { Enemy } from '../rpg/classes/enemy.js';
import { fight, display } from '../rpg/fight.js';
import { cacheSongs } from '../sound/cacheSongs.js';
import { updateData } from '../data/updateData.js';
import { playYouTube } from '../sound/playYouTube.js';
import { getVoiceConnection } from '@discordjs/voice';
import { addToInventory } from '../rpg/addToInventory.js';
import { databaseError } from '../utils/databaseError.js';
import { generateWeapon } from '../rpg/generateWeapon.js';
import { selectRandom, getRandom, getChance } from '../utils/random.js';

export default {
    name: 'quest',
    description: 'Fight a random enemy and pick up cool loot',
    category: 'rpg',
    options: [{
        type: 5, //BOOLEAN
        name: 'music',
        description: 'Whether to force play/mute battle theme',
        required: false
    }],
    async execute(client, db, interaction) {
        const data = await getData(db, interaction.user.id);
        if (!data) {
            return databaseError(interaction, 'rpg');
        }

        //set up challenger and random enemy
        const challenger = new Human(interaction.member, data, db);
        challenger.turn = 2;
        const enemy = new Enemy(data.Lvl);
        challenger.opponents = [enemy];
        enemy.opponents = [challenger];
        const party = [challenger, enemy];

        //encounter text
        const encounter = [
            'You ran into :c!',
            'You are challenged by :c!',
            'You stumble across :c!',
            ':c gets ready to fight!',
            ':c appeared!'
        ];

        //musical enemies come with sound
        const music = interaction.options.getBoolean('music');
        //music can be true, false, or null
        if (music !== false) {
            if ((music || enemy.weapon.musical) && 
                challenger.member.voice.channel &&
                !challenger.member.voice.deaf)
            {
                playMusic(client, db, challenger.member.voice.channel, enemy);
            }
        }
        
        //start fight
        await interaction.reply(`${selectRandom(encounter).replace(':c', enemy.name)} ${enemy.image} (Lvl ${enemy.lvl})`);
        const message = await interaction.followUp('<reserved>');
        const actions = await fight(client, party, message);
        
        //tie
        if (challenger.hp <= 0 && enemy.hp <= 0) {
            actions.push("**It's a tie...**");
        }
        //win 
        else if (challenger.hp > 0) {
            const xp = enemy.getXP();
            let awardText = `You win ${xp} XP and `;

            let item, nanners = 0;
            const rareChances = [0, 58, 30, 10, 2];
            const treasureHunter = challenger.weapon.treasureHunter;

            if (enemy.weapon.type === '🎻') {
                item = generateWeapon(challenger.lvl, { chances: rareChances, type: 'fiddle', treasureHunter: treasureHunter });
                const colors = ['mayonnaise', 'blue', 'purple', 'gold', 'crimson'];
                awardText += `this shiny fiddle made of ${colors[item.rarity]}!`;
            }
            else if (enemy.weapon.type === '🧒' && !enemy.enraged) {
                nanners = getRandom(100, 500);
                awardText += `${nanners} GBPs!`;
            }
            else if (getChance(15)) {
                item = { type: 'crack', id: v4() };
                awardText += 'found some crack!';
            }
            else {
                const options = {
                    //TODO 500 and 1000 increased legend chances
                    chances: 
                        enemy.creature.emoji === '🦄' ? rareChances :
                        challenger.wished ? [0, 0, 20, 10, 1] :
                        null,
                    type: enemy.creature.emoji === '🕷' && !challenger.wished ? 'bag' : null,
                    treasureHunter: treasureHunter
                };
                item = generateWeapon(challenger.lvl, options);
                awardText += `a${item.rarity === 2 ? 'n' : ''} ${item.getRarity()} ${item.name}!`;
            }

            updateData(db, challenger.member.user, { xp: xp, gbps: nanners, renown: 1 });
            if (item) {
                const buyback = await addToInventory(client, db, challenger.member.user, item);
                if (buyback) {
                    awardText += ' *(buyback)*';
                }
            }
            
            actions.push(awardText);
        }
        //lose a GBP
        else {
            updateData(db, challenger.member.user, { gbps: -5, renown: 1 });
            actions.push('You lose 5 GBPs.');
        }

        display(client, message, actions, party, actions.length - 1);

        //end sound clip for enemies with battle music
        const connection = getVoiceConnection(interaction.guild.id);
        if (!client.rocking && music !== false && connection && (music || enemy.weapon.musical)) {
            connection.destroy();
        }
    }
};

async function playMusic(client, db, voiceChannel, enemy) {
    if (!client.questSongs?.length) {
        await cacheSongs(client, db);
    }

    if (!client.questSongs.length) {
        return;
    }

    const songs = [];
    const generic = getChance(50);

    client.questSongs.forEach(song => {
        //if enemy plays instrument, limit songs to only those fitting the instrument
        if (enemy.weapon.musical) {
            //skip songs without matching instrument or enemy
            if (song.Instrument !== enemy.weapon.type || (song.enemy && song.Enemy !== enemy.creature.emoji)) {
                return;
            }

            //prioritize song if matching enemy
            if (song.Enemy === enemy.creature.emoji) {
                push(song, 10);
            }

            //reduce probability for generic songs
            if (!song.Enemy) {
                push(song, 1);
            }
        }
        //play generic battle music or enemy-specific music
        else {
            //generic
            if (generic && !song.Enemy && !song.Instrument) {
                push(song, 1);
            }
            //enemy-based
            if (song.Enemy === enemy.creature.emoji) {
                //song has instrument
                if (song.Instrument) {
                    push(song, 1);
                }
                //prioritize songs that do not have instruments
                else {
                    push(song, 2);
                }
            }
        }
    });

    if (songs.length) {
        const song = selectRandom(songs);
        playYouTube(client, voiceChannel, song.URL, { seek: song.Seek, volume: 0.25 });
    }

    function push(song, amount) {
        for (let i=0; i<amount; i++) {
            songs.push(song);
        }
    }
}