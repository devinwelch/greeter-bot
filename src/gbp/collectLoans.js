import { updateData } from '../data/updateData.js';
import { commify } from '../utils/commify.js';

/**
 * Collect loans from all users with interest
 * @returns void
 */

export function collectLoans(client, db) {
    db.scan({ TableName: 'GBPs' }, function(err, data) {
        data.Items.filter(d => d.Loan > 0).forEach(d => {
            client.users.fetch(d.UserID).then(user => {
                updateData(db, user, { gbps: -d.Loan, loan: 0 });
                updateData(db, client.user, { gbps: d.Loan });

                client.channels.cache.get(client.ids.channels.botchat).send(`Reclaimed ${commify(d.Loan)} GBPs from ${user}`);
            });    
        });
    });
}