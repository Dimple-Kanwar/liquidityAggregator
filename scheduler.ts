import schedule from 'node-schedule';
import {frequency} from "./app/config.json";
import { executeJob } from './main';

schedule.scheduleJob(frequency, async() => {
    // run the job here
    await executeJob();
});

//graceful job shut down when a system interrupt occurs
process.on('SIGINT', function () { 
    schedule.gracefulShutdown()
    .then(() => process.exit(0))
});
