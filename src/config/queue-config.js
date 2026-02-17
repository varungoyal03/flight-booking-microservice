const amqplib = require('amqplib');

let channel, connection;

async function connectQueue() {
    try {
        connection = await amqplib.connect("amqp://localhost");
        channel = await connection.createChannel();

        await channel.assertQueue('noti-queue');
        // setInterval(() => {
        //     channel.sendToQueue("noti-queue", Buffer.from("Something to do " + Date.now()));
        // }, 5000);
        await channel.assertQueue('seat-release-queue'); // NEW queue for seat release
    } catch (error) {
        console.log(error);
    }
}

async function sendData(queueName, data) {
    try {
        console.log(`Sending data to queue ${queueName} at `, Date.now());
        await channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)));
    } catch (error) {
        console.log(error)
    }
}

module.exports = {
    connectQueue,
    sendData,
}