import { playMe } from '../sound/playMe.js';
import { updateData } from '../data/updateData.js';
import { getVoiceConnection } from '@discordjs/voice';

export function onVoice(client, db, oldState, newState) {
    if (newState.member.user.id === client.user.id ||       //member is greeter-bot
        getVoiceConnection(newState.guild.id) ||            //greeter-bot is talking
        !newState.channel ||                                //user isn't in voice channel
        newState.selfDeaf ||                                //user is deafened
        newState.selfMute ||                                //user is muted
        client.themeSongs.indexOf(newState.id) !== -1) {    //user has played song today
            return;
    }
    
    const date = new Date();
    const chud = newState.member.user.username.toUpperCase() === 'CHUD' && date.getMonth() === 4 && date.getDate() === 14;

    playMe(client, newState.channel, newState.member.user.username, { gnomed: true, chud: chud, timeout: 15000 });
    client.themeSongs.push(newState.id);
    console.log(`${newState.member.user.username} entered the chat!`);
    updateData(db, newState.member.user, { gbps: 10 });
}