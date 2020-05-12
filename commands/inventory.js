module.exports = {
    name: 'inventory',
    description: 'See what items you have in your inventory',
    execute(client, config, db, message, args) {
        const params = {
            TableName: 'GBPs',
            Key: { UserID: message.member.id }
        };

        db.get(params, function(err, data) {
            if (err) {
                console.log('Could not get inventory:', err);
            }
            else if (!data.Item) {
                message.reply("I don't even know who you are.");
            }
            else {
                message.reply(`You have the following items: ${Object.keys(data.Item.Inventory).filter(i => i !== 'random').join(', ')}`);
            }
        });
    }
};