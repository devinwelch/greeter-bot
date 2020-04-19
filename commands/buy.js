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
                message.channel.send('In stock: **antidote**(10GBP). Use:`!buy [item]` to purchase.');
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
            Key: {
                'Username': member.user.username,
                'ID': member.user.id
            }
        };
    
        db.get(params, function(err, data) {
            if (err) {
                console.error('Unable to find user. Error:', JSON.stringify(err, null, 2));
                channel.send("Error, can't find user");
            } else if (!data.Item || data.Item.GBPs < 10) {
                channel.send("You can't afford this.");
            } else {
                updateGBPs(db, member.user, -10);
                console.log(`${member.user.username} bought an antidote.`);
                channel.send(`${member.user.username} has been cured of coronavirus! Stay safe...`);
                if (member.roles.cache.has('687436756559200367')) {
                    member.remove('687436756559200367').then(console.log).catch(console.error);
                }
                
                /*params.UpdateExpression = 'set GBPs = GBPs - :val'
                params.ExpressionAttributeValues = { ':val': 10 }
                db.update(params, function(err, data) {
                    if (err) {
                        console.error('Unable to update user. Error JSON:', JSON.stringify(err, null, 2))
                        channel.send("Sorry, shop's closed.")
                    } else {
                        console.log(member.user.username + ' successfully bought an antidote.')
                        channel.send(member.user.username + " has been cured of coronavirus! Stay safe...")
                        if (member.roles.has('687436756559200367')) {
                            member.removeRole('687436756559200367').then(console.log).catch(console.error)
                        }
                    }
                })*/
            }
        });
    }
};