import { MessageActionRow, MessageButton } from 'discord.js';

/**
 * Invites another user to join via an interaction
 * @returns Promise<boolean>
 */
export async function sendInvite(client, interaction, challenger, target, event, wager) {
    const invite = `${target.toString()}! ${challenger.username} challenges you to ${event} for ${wager ? `**${wager} GBPs**` : 'fun'}!`;

    const buttons = [
        new MessageActionRow()
            .addComponents([
                new MessageButton()
                    .setLabel('Decline/Cancel')
                    .setEmoji(client.ids.emojis.baba)
                    .setStyle('DANGER')
                    .setCustomId('decline'),
                new MessageButton()
                    .setLabel('Accept')
                    .setEmoji(client.ids.emojis.yeehaw)
                    .setStyle('SUCCESS')
                    .setCustomId('accept')
            ])
    ];

    await interaction.reply({ content: invite, components: buttons });
    interaction.message = await interaction.fetchReply();

    //await actions for up to 120 sec
    const filter = buttonInteraction => buttonInteraction.message === interaction.message;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 120000 });

    let accepted = false;

    collector.on('collect', buttonInteraction => {
        //challenger or target
        if (buttonInteraction.user === challenger || buttonInteraction.user === target) {
            //target accepts
            if (buttonInteraction.customId === 'accept' && buttonInteraction.user === target) {
                buttonInteraction.deferUpdate();
                accepted = true;
                collector.stop();
            }
            //duel is canceled
            else if (buttonInteraction.customId === 'decline') {
                interaction.message.delete().catch(console.error);
                collector.stop();
            }
        }
    });

    return new Promise(function(resolve) {
        collector.on('end', () => {
            resolve(accepted);
        });
    });
}