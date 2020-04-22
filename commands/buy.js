const { updateGBPs } = require('../utils.js');

module.exports = {
    name: 'buy',
    description: 'Spend your good boy points on **useful** items!',
    usage: '[item]',
    execute(client, config, db, message, args) {
        //TODO: This is trash and I need to refactor so that the shop can scale easily
        switch(args) {
            case null:
            case '':
                message.channel.send('In stock: **antidote**(100 GBPs). Use:`!buy [item]` to purchase.');
                break;
            case 'antidote':
                this.buyAntidote(db, message.member, message.channel);
                break;
            default:
                message.channel.send('Item not found. Use:`!buy` for list of available items.');
                break;
        }
    },

    buyAntidote(db, member, channel) {
        const params = {
            TableName: 'GBPs',
            Key: { 'UserID': member.user.id }
        };
    
        db.get(params, function(err, data) {
            if (err) {
                console.error('Unable to find user. Error:', JSON.stringify(err, null, 2));
                channel.send("Error, can't find user");
            } else if (!data.Item || data.Item.GBPs < 100) {
                channel.send("You can't afford this.");
            } else {
                const coronaID = '687436756559200367';
                updateGBPs(db, member.user, -100);
                console.log(`${member.user.username} bought an antidote.`);
                channel.send(`${member.user.username} has been cured of coronavirus! Stay safe...`);
                if (member.roles.cache.has(coronaID)) {
                    member.roles.remove(coronaID).then(console.log).catch(console.error);
                }
            }
        });
    }
};