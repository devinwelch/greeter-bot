module.exports = {
    name: 'leaderboard',
    aliases: ['rank'],
    description: 'See list of goodest boys on the server',
    execute(client, config, db, message, args) {
        db.scan({ TableName: 'GBPs'}, function(err, data) {
            if (err) {
                return console.error('Unable to get leaderboard. Error:', JSON.stringify(err, null, 2));
            }
            else {
                const sorted = data.Items.filter(e => e.Username !== 'greeter-bot').sort(function(a, b) { return (b.GBPs + b.Stash) - (a.GBPs + a.Stash); });
                const leaderboard = [];
                const l = sorted.length;

                leaderboard.push('');
                leaderboard.push('**Good boys**');
                leaderboard.push('```');
                leaderboard.push(`1. ${sorted[0].Username} (${getTotal(sorted[0])} GBPs)`);
                leaderboard.push(`2. ${sorted[1].Username} (${getTotal(sorted[1])} GBPs)`);
                leaderboard.push(`3. ${sorted[2].Username} (${getTotal(sorted[2])} GBPs)`);
                leaderboard.push('```');
                leaderboard.push('**Bad boys**');
                leaderboard.push('```');
                leaderboard.push(`${l - 2}. ${sorted[l - 3].Username} (${getTotal(sorted[l - 3])} GBPs)`);
                leaderboard.push(`${l - 1}. ${sorted[l - 2].Username} (${getTotal(sorted[l - 2])} GBPs)`);
                leaderboard.push(`${l    }. ${sorted[l - 1].Username} (${getTotal(sorted[l - 1])} GBPs)`);
                leaderboard.push('```');

                if (sorted.some(e => e.UserID === message.author.id)) {
                    const rank = sorted.indexOf(sorted.find(e => e.UserID === message.author.id)) + 1;
                    let judgment = '';
                    if (rank === 69) {
                        judgment = '*Nice.*';
                    }
                    else if (l - rank === 0) {
                        judgment = 'Shameful.';
                    }
                    else if (l - rank <= 10) {
                        judgment = 'I know you can be better.';
                    }
                    else if (rank === 1) {
                        judgment = 'Wow, congrats!';
                    }
                    else if (rank <= 10) {
                        judgment = 'Cool!';
                    }

                    leaderboard.push(`You rank ${rank}/${l}. ${judgment}`);
                }

                message.reply(leaderboard);
            }
        });
    }
};

function getTotal(data) {
    return data.GBPs + data.Stash;
}