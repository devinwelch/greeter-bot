const { playMe, updateGBPs } = require('../utils.js');

module.exports = {
    execute(client, db, oldState, newState) {
        if (newState.member.user.id === client.user.id ||       //member is greeter-bot
            client.voice.connections.size ||                    //greeter-bot is talking
            !newState.channel ||                                //user isn't in voice channel
            newState.selfDeaf ||                                //user is deafened
            newState.selfMute ||                                //user is muted
            client.themeSongs.indexOf(newState.id) !== -1) {    //user has played song today
                return;
            }

        //play theme song upon entering
        playMe(client, newState.channel, newState.member.user.username, true, true);
        client.themeSongs.push(newState.id);
        console.log(`${newState.member.user.username} entered the chat!`);
        updateGBPs(db, newState.member.user, 3);
    }
};