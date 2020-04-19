const Discord = require('discord.js');
const AWS = require('aws-sdk');
const schedule = require('node-schedule');
const fs = require('fs');

const config = require('./config.json');
const onVoice = require('./controllers/onVoiceController.js');
const onReaction = require('./controllers/onReactionController.js');
const onMessage = require('./controllers/onMessageController.js');
const { declareDay, jam, spook, infect } = require('./utils.js');

const client = new Discord.Client({ partials: ['MESSAGE', 'REACTION'] });

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
        onReaction.execute(client, db, reaction, user);
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
schedule.scheduleJob({ date: 11, month: 3, tz: config.timezone, second:[0,30] }, function () { //TODO: make this shit work
    jam(client, '411.mp3');
});
schedule.scheduleJob({ date: 21, month: 8, tz: config.timezone }, function () {
    jam(client, '921.mp3');
});

//Funny skeleton man
schedule.scheduleJob('*/13 4-23 31 10 *', function () {
    spook(client);
});
schedule.scheduleJob('*/13 0-3 1 11 *', function () {
    spook(client);
});

//Reset theme songs
schedule.scheduleJob({ minute: 0, hour: 0, tz: config.timezone }, function () {
    console.log('Resetting theme songs');
    client.themeSongs = [];
});

//Coronavirus!
schedule.scheduleJob({ minute: 0 }, function () {
    infect(client);
});