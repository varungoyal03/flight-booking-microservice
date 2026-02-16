const express = require('express');

const { ServerConfig ,QueueConfig} = require('./config');
const apiRoutes = require('./routes');
const CronJobs  = require('./utils/common/cron-jobs');


CronJobs.scheduleCrons();

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended : true}));
app.use(express.text());
app.use('/api', apiRoutes);

app.listen(ServerConfig.PORT, async () => {
    console.log(`Successfully started the server on PORT : ${ServerConfig.PORT}`);
        await QueueConfig.connectQueue();
});

