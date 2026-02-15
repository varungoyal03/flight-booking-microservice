const cron = require('node-cron');

const { BookingService } = require('../../services');

function scheduleCrons() {
    cron.schedule('*/5 * * * *', async () => { //Run after every 5 minute.
        const response = await BookingService.cancelOldBookings();
        console.log("Cancelled old bookings cron job executed.no of bookings cancelled: ", response[0]);
        return response;
    })
}

module.exports = {
    scheduleCrons
}