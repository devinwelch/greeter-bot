require('dotenv').config();
const Discord = require('discord.js');
const AWS = require('aws-sdk');
const schedule = require('node-schedule');
const fs = require('fs');

const config = require('./config.json');
const onVoice = require('./controllers/onVoiceController.js');
const onReaction = require('./controllers/onReactionController.js');
const onMessage = require('./controllers/onMessageController.js');
const { declareDay, jam, spook, infect, collectLoans, giveaway, updateGBPs } = require('./utils.js');

const client = new Discord.Client({
    disableEveryone: false,
    partials: ['MESSAGE', 'REACTION'],
    presence: { activity: { name: 'all you degens' }}
});

client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

AWS.config.update({
    region: config.db.region,
    endpoint: config.db.endpoint
});
const db = new AWS.DynamoDB.DocumentClient();

client.on('ready', () => {
    client.swears = fs.readFileSync('./swears.txt').toString().split(',');
    client.themeSongs = [];
    //client.rolls = [];
    console.log('I am ready!');
});

client.on('voiceStateUpdate', (oldState, newState) => {
    try {
        onVoice.execute(client, db, oldState, newState);
    }
    catch (error) {
        console.error;
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    try {
        if (reaction.partial) {
            await reaction.fetch();
        }
        onReaction.execute(client, config, db, reaction, user);
    }
    catch (error) {
        console.error;
    }
});

client.on('message', message => {
    try {
        onMessage.execute(client, config, db, message);
    }
    catch (error) {
        console.error;
    }
});

client.login(process.env.BOT_TOKEN);

//Tell the time
schedule.scheduleJob({ minute: 0, dayOfWeek: 3, tz: config.timezone }, function() {
     declareDay(client);
});

//Holiday anthem
schedule.scheduleJob({ date: 11, month: 3, tz: config.timezone }, function() {
    jam(client, '411.mp3');
});
schedule.scheduleJob({ date: 21, month: 8, tz: config.timezone }, function() {
    jam(client, '921.mp3');
});

//Funny skeleton man
schedule.scheduleJob('*/13 4-23 31 10 *', function() {
    spook(client);
});
schedule.scheduleJob('*/13 0-3 1 11 *', function() {
    spook(client);
});

//Midnight
schedule.scheduleJob({ minute: 0, hour: 0, tz: config.timezone }, function() {
    console.log('Resetting theme songs');
    client.themeSongs = [];
    collectLoans(client, db);
});

//Bail out!
schedule.scheduleJob({ minute: 0, hour: 17, tz: config.timezone }, function() {
    giveaway(client, db);
});

//Hourly
schedule.scheduleJob({ minute: 0 }, function() {
    //client.rolls = [];
    infect(client);
});

//Bailout
schedule.scheduleJob({ year: 2020, date: 28, month: 3, minute: 0, hour: 18, tz: config.timezone }, function() {
    client.channels.cache.get(config.ids.mainChat).send(`@everyone\nMy fellow hooligans,\n\nIt is with great displeasure for me to address you today. It seems that degenerative behavior is at an all time high - maybe this is due to panic surrounding the coronavirus role plaguing our server, or perhaps it is true nature revealed. For a real long time I've always pondered *why do good girls like bad boys*? They can't even afford to buy antidotes. My only hope is that you look toward your fellow good boys and emulate all you see. Join chat for the camaraderie. Lend a sticker to those who are down. Take for example, <@703027755566104686> - a pure soul that has donated the majority of this wealth and has *never* abused the system. We can all strive to be better; I hope that this stimulus package motivates you to be the good boy you've always dreamed of being. May we all be flush with tendies. With this, I am depositing 1200 GBPs into all recent taxpayer's account (i.e. has GBPs on record) **out of my own pocket**. Those still negative will start out with a fresh slate. This stint of generosity will be short-lived, so be careful how you invest it. May bot have mercy on your souls. :BananaCrown:\n\nRegards,\n<@${client.user.id}>`);

    db.scan({ TableName : 'GBPs' }, function(err, data) {
        if (err) {
            console.error('Unable to bail out. Error:', JSON.stringify(err, null, 2));
        } else {
            data.Items.forEach(function(row) {
                const user = { 
                    id: row.UserID,
                    username: row.Username 
                };

                updateGBPs(db, user, 1200);
            });

            updateGBPs(db, client.user, data.Items.length * -1200);
        }
    });
});