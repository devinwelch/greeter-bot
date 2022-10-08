import { getData } from '../data/getData.js';
import { getChance } from '../utils/random.js';
import { updateData } from '../data/updateData.js';
import { getNetWorth } from '../gbp/getNetWorth.js';
import { databaseError } from '../utils/databaseError.js';

export default {
    name: 'pray',
    description: 'Pray to RNGesus to cleanse you of your debt once per day',
    category: 'gbp',
    async execute(client, db, interaction) {
        if (client.prayers.includes(interaction.user.id)) {
            interaction.reply({ content: 'You already prayed today!', ephemeral: true });
        }
        else {
            const data = await getData(db, interaction.user.id);
            if (!data) {
                return databaseError(interaction, 'prayer');
            }

            if (await getNetWorth(db, data, false) < 0) {
                client.prayers.push(interaction.user.id);

                if (getChance(data.Faith || 1)) {
                    const params = {
                        TableName: 'GBPs',
                        Key: { 'UserID': interaction.user.id },
                        UpdateExpression: 'set GBPs = :z, Stash = :z, HighScore = :z, Loan = :z, Faith = :z, Coins = :z',
                        ExpressionAttributeValues: { ':z': 0 }
                    };

                    db.update(params, function(err) {
                        if (err) {
                            console.error('Unable to zero user. Error JSON:', JSON.stringify(err, null, 2));
                        }
                        else {
                            console.log(`${interaction.user.username} has been redeemed!`);
                            interaction.reply("RNGesus's blessings be upon you.");
                        }
                    });
                }
                else {
                    updateData(db, interaction.user, { faith: 2 });
                    interaction.reply('🙏');
                }
            }
            else {
                interaction.reply('😇');
            }
        }
    }
};