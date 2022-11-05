import { resetEconomy } from '../gbp/resetEconomy.js';
import { collectLoans } from '../gbp/collectLoans.js';

/**
 * performs economy reset, collects loans, and refreshes cache of temporary variables
 * @param client 
 * @param db 
 */

export function midnight(client, db) {
    //check for resets otherwise collect on outstanding loans
    db.scan({ TableName: 'Resets' }, function (err, data) {
        if (err) {
            console.log('Unable to check for resets:', JSON.stringify(err, null, 2));
        }
        else if (data.Items.some(e => !e.Executed)) {
            resetEconomy(client, db, data);
        }
        else {
            collectLoans(client, db);
        }
    });

    //clear channel of generic anouncements
    const botchat = client.channels.cache.get(client.ids.channels.botchat);
    const fiveDaysAgo = Date.now() - (1000 * 60 * 60 * 24 * 5); 
    botchat.messages.fetch({ limit: 100 })
    .then(messages => {
        messages.filter(msg => 
            msg.author === client.user &&
            msg.createdTimestamp < fiveDaysAgo && 
            (
                msg.content.includes('wins the daily lotto') ||
                msg.content.includes('Yuck, stay away') ||
                msg.content.includes('leveled up to') ||
                msg.content.includes('Reclaimed') ||
                msg.content.includes('Go forth!')
            )
        )
        .forEach(msg => {
            msg.delete().catch(console.error);
            process.on('unhandledRejection', () => {});
        });
    });
}