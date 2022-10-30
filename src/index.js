import aws from 'aws-sdk';
import dotenv from 'dotenv';
import config from './config.js';
import { readdirSync } from 'fs';
import { Client, Collection } from 'discord.js';
import { scheduleJobs } from './scheduling/scheduleJobs.js';
import { onVoice } from './controllers/onVoiceController.js';
import { onMessage } from './controllers/onMessageController.js';
import { onReaction } from './controllers/onReactionController.js';
import { onInteraction } from './controllers/onInteractionController.js';

//initialize bot
const client = new Client({
    allowedMentions: { parse: ['users', 'roles', 'everyone'], repliedUser: true },
    presence: { activity: { type: 'WATCHING', name: 'total degeneration' } },
    intents: ['GUILDS', 'GUILD_VOICE_STATES', 'GUILD_MESSAGES', 'DIRECT_MESSAGE_REACTIONS', 'MESSAGE_CONTENT'],
    partials: ['MESSAGE', 'REACTION'],
});

client.timezone = config.timezone;
client.ids = config.ids;
client.themeSongs = [];
client.prayers = [];
client.resets = [];
client.buybacks = {};

//read commands
client.commands = new Collection();
const commandFiles = readdirSync('./src/commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    setCommand(file);
}

async function setCommand(file) {
    const command = (await import(`./commands/${file}`)).default;
    client.commands.set(command?.name, command);
}

//initialize DynamoDB connection
aws.config.update({
    region: config.db.region,
    endpoint: config.db.endpoint
});
const db = new aws.DynamoDB.DocumentClient();

//bot is ready
client.on('ready', () => {
    console.log('I am ready!');
});

//user joins voice
client.on('voiceStateUpdate', (oldState, newState) => {
    try {
        onVoice(client, db, oldState, newState);
    }
    catch (error) {
        console.error;
    }
});

//user sends message
client.on('messageCreate', message => {
    try {
        onMessage(client, db, message);
    }
    catch (error) {
        console.error;
    }
});

//user reacts
client.on('messageReactionAdd', async (reaction, user) => {
    try {
        if (reaction.partial) {
            await reaction.fetch();
        }
        onReaction(client, db, reaction, user);
    }
    catch (error) {
        console.error;
    }
});

//user interacts
client.on('interactionCreate', interaction => {
    try {
        onInteraction(client, db, interaction);
    }
    catch (error) {
        console.error;
    }
});

//log in
dotenv.config();
client.login(process.env.BOT_TOKEN);

//schedule events
scheduleJobs(client, db);