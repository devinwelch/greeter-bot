import { updateData } from '../data/updateData.js';

/**
 * Collect loans from all users with interest
 * @returns void
 */

export function collectLoans(client, db) {
    const interest = 0.1;

    db.scan({ TableName: 'GBPs' }, function(err, data) {
        data.Items.filter(d => d.Loan > 0).forEach(d => {
            const reclaim = Math.ceil(d.Loan * (1 + interest));
            
            client.users.fetch(d.UserID).then(user => {
                updateData(db, user, { gbps: -reclaim, loan: 0 });
                updateData(db, client.user, { gbps: reclaim });

                client.channels.cache.get(client.ids.channels.botchat).send(`Reclaimed ${reclaim} GBPs from ${user}`);
            });    
        });
    });
}