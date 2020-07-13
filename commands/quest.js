const { selectRandom, playSong, getData, updateData, generateWeapon, addToInventory, getRandom } = require('../utils.js');
const { fight, display } = require('../rpg/fight');
const { Human } = require('../rpg/classes/human');
const { Enemy } = require('../rpg/classes/enemy');
const { v4: uuidv4 } = require('uuid');

module.exports = {
    name: 'quest',
    description: 'Fight a random enemy to earn GBP! React in time to land a hit!',
    category: 'rpg',
    execute(client, config, db, message, args) {
        getData(db, message.author.id)
        .then(data => {
            if (!data.Responses || !data.Responses.GBPs || !data.Responses.GBPs.length) {
                return;
            }

            data = data.Responses.GBPs[0];
            const challenger = new Human(message.member, data);
            challenger.turn = 2;

            //determine random enemy
            const enemy = new Enemy(data.Lvl);

            //encounter text
            const encounter = [
                'You ran into :c!',
                'You are challenged by :c!',
                'You stumble across :c!',
                ':c gets ready to fight!',
                ':c appeared!'
            ];
            
            message.reply(`${selectRandom(encounter).replace(':c', enemy.name)} ${enemy.image} (Lvl ${enemy.lvl})`)
                .then(() => setup(client, db, message.channel, challenger, enemy))
                .catch(console.error);

            if (enemy.weapon.musical && message.member.voice.channel && !message.member.voice.mute && !message.member.voice.deaf) {
                const song = enemy.creature.emoji === '💀' ? 'spooky' : enemy.weapon.name;
                playSong(client, message.member.voice.channel, `Enemies/${song}.mp3`, true);
            }
        });   
    }
};

async function setup(client, db, channel, challenger, enemy) {
    challenger.opponents = [enemy];
    enemy.opponents = [challenger];

    const party = [challenger, enemy];
    const message = await channel.send('<reserved>');

    const actions = await fight(client, party, message);
    getResults(client, db, message, party, actions);
}

async function getResults(client, db, message, party, actions) {
    const challenger = party.find(fighter => fighter.human);
    const enemy = party.find(fighter => fighter.enemy);

    //tie
    if (challenger.hp <= 0 && enemy.hp <= 0) {
        actions.push("**It's a tie...**");
    }
    //award 
    else if (challenger.hp > 0) {
        const xp = Math.round(enemy.bonus * (100 + (enemy.creature.xp || 0)));
        let awardText = `You win ${xp} XP and `;

        let item;
        if (enemy.weapon.type === '🎻') {
            item = generateWeapon(challenger.lvl, { chances: [0, 6, 3, 1], type: 'fiddle' });
            const colors = ['white', 'blue', 'purple', 'gold'];
            awardText += `this shiny fiddle made of ${colors[item.rarity]}!`;
        }
        else if (!getRandom(19)) {
            item = { type: 'crack', id: uuidv4() };
            awardText += 'found some crack!';
        }
        else {
            const options = {
                chances: enemy.creature.emoji === '🦄' ? [0, 6, 3, 1] : null,
                type: enemy.creature.emoji === '🕷' ? 'bag' : null
            };
            item = generateWeapon(challenger.lvl, options);
            awardText += `a ${item.getRarity()} ${item.name}!`;
        }

        updateData(db, challenger.member.user, { xp: xp });
        const buyback = await addToInventory(client, db, challenger.member.user, item);
        if (buyback) {
            awardText += ' *(buyback)*';
        }
        actions.push(awardText);
    }
    //lose a GBP
    else {
        updateData(db, challenger.member.user, { gbps: -5 });
        actions.push('You lose 5 GBPs.');
    }

    display(client, message, actions, party, actions.length - 1);

    //end sound clip for enemies with battle music
    if (enemy.weapon.musical && message.guild.me.voice.channel && !client.rocking) {
        message.guild.me.voice.channel.leave();
    }

    message.reactions.removeAll();
}