const axios = require('axios');
const { Enums } = require('../utils/common');
const { BOOKED, CANCELLED, INITIATED, PENDING } = Enums.BOOKING_STATUS;
const { BookingRepository } = require('../repositories');
const { ServerConfig } = require('../config/')
const db = require('../models');
const AppError = require('../utils/errors/app-error');
const { StatusCodes } = require('http-status-codes');

const bookingRepository = new BookingRepository();

async function createBooking(data) {
    try {
        // 1️⃣ Fetch flight details (NO transaction)
        const flightRes = await axios.get(
            `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}`
        );

        const flight = flightRes.data.data;

        // 2️⃣ Reserve seats FIRST
        await axios.patch(
            `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}/seats`,
            { seats: data.noOfSeats }
        );

        // 3️⃣ Now start DB transaction (DB ONLY)
        const transaction = await db.sequelize.transaction();

        try {
            const totalCost = flight.price * data.noOfSeats;

            const booking = await bookingRepository.createBooking(
                {
                    ...data,
                    totalCost,
                    status: PENDING
                },
                transaction
            );

            await transaction.commit();
            return booking;

        } catch (error) {
            await transaction.rollback();

            // OPTIONAL: compensate seats
            await axios.patch(
                `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}/seats`,
                { seats: data.noOfSeats, inc: true }
            );

            throw error;
        }

    } catch (error) {
        throw error;
    }
}


// async function createBooking(data) {
   
//     try {
    
//         const flight = await axios.get(`${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}`);
//         const flightData = flight.data.data; 
//         const totalBillingAmount = data.noOfSeats * flightData.price;
//         const bookingPayload = { ...data, totalCost: totalBillingAmount, status: INITIATED }


//          const transaction = await db.sequelize.transaction();

//         const booking = await bookingRepository.createBooking(bookingPayload, transaction);
//         await axios.patch(`${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}/seats`, {
//             seats: data.noOfSeats
//         });
      
//         await transaction.commit();
//         return booking;
//     } catch (error) {
//         await transaction.rollback();
//         throw error;
//     }
// }

//


async function makePayment(data) {
    const transaction = await db.sequelize.transaction();
    try {
        //Get booking details using booking repository.
        const bookingDetails = await bookingRepository.get(data.bookingId, transaction);

        //--------- Write the logic for "how much time should payment making portal should be up" ---------------

        //Check if the booking status is cancelled.
        if(bookingDetails.status == CANCELLED) {
            throw new AppError("The booking has expired", StatusCodes.BAD_REQUEST);
        }

        //Compute the booking time and current time.
        const bookingTime = new Date(bookingDetails.createdAt);
        const currentTime = new Date();

        //Constraint on time.
        if(currentTime - bookingTime > 1000 * 60 * 5) {
            // [TASK] After canceling the booking bring all the seats back to flight.
            await cancelBooking(data.bookingId);
            throw new AppError("The booking has expired", StatusCodes.BAD_REQUEST);
        }

        //check weather the booking amount is equal to amount paid
        if (bookingDetails.totalCost != data.totalCost) {
            throw new AppError("Amount paid does not match the total cost", StatusCodes.BAD_REQUEST);
        }

        //check weather the user is the same who created the booking.
        if (bookingDetails.userId != data.userId) {
            throw new AppError("User not authorized to make payment", StatusCodes.UNAUTHORIZED);
        }

        // If everything goes well then set the status of booking to "BOOKED".
        const booking = await bookingRepository.update(data.bookingId, {status : BOOKED}, transaction);

        await transaction.commit();

        Queue.sendData({
            recepientEmail: `vivektarun1234@gmail.com`,
            subject: `Flight booked`,
            text: `Booking successfully done for the flight ${flightData.flightNumber}`
        });
        
        return booking;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
module.exports = {
    createBooking,
    makePayment
};