import { getPopularChannel } from '../sound/getPopularChannel.js';
import { playFile } from '../sound/playFile.js';
import { scheduleJob } from 'node-schedule';
//import { lottery } from './lottery.js'; TODO
import { infect } from '../utils/infect.js';
import { midnight } from './midnight.js';
import { giveXP } from './giveXP.js';
import { spook } from './spook.js';
//import { jam } from './jam.js'; TODO
import { stonks } from './stonks.js';

/**
 * schedules tasks
 * @param client 
 * @param config 
 * @param db 
 */

export function scheduleJobs(client, db) {
    //Hourly
    scheduleJob({ minute: 0 }, function() {
        infect(client);
        stonks(client, db);
    });

    //Minutely
    scheduleJob({ second: 0 }, function() {
        giveXP(client, db);
    });

    //Midnight
    scheduleJob({ minute: 0, hour: 0, tz: client.timezone }, function() {
        console.log('Nightly reset');
        client.themeSongs = [];
        client.prayers = [];
        midnight(client, db);
    });

    //Economy stimulation!
    // scheduleJob({ minute: 0, hour: 17, tz: config.timezone }, function() {
    //     lottery(client, db);
    // });

    //Tell the time
    scheduleJob({ minute: 0, dayOfWeek: 3, tz: client.timezone }, async function() {
        const c = await getPopularChannel(client);
        playFile(client, c, 'other/wednesday.mp3', true);
    });

    //Holiday anthems
    // scheduleJob({ date: 11, month: 3, tz: config.timezone }, function() {
    //     jam(client, '411.mp3');
    // });
    // scheduleJob({ date: 21, month: 8, tz: config.timezone }, function() {
    //     jam(client, '921.mp3');
    // });

    //Funny skeleton man
    //scheduleJob('*/13 4-23 31 10 *', function() {
        //spook(client);
    //});
    //scheduleJob('*/13 0-3 1 11 *', function() {
        //spook(client);
    //});
}
