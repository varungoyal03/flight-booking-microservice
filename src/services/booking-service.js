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

        // 3️⃣ Now start DB transaction (DB ONLY) is needed??
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
        // 1️⃣ Fetch booking inside transaction
        const bookingDetails = await bookingRepository.get(
            data.bookingId,
            transaction
        );

        // 2️⃣ Allow payment ONLY in PENDING state
        if (bookingDetails.status !== PENDING) {
            throw new AppError(
                "Payment allowed only for pending bookings",
                StatusCodes.BAD_REQUEST
            );
        }

        // 3️⃣ Enforce payment time window
        const bookingTime = new Date(bookingDetails.createdAt);
        const currentTime = new Date();
        const PAYMENT_WINDOW = 5 * 60 * 1000; // 5 minutes

        if (currentTime - bookingTime > PAYMENT_WINDOW) {
            // Mark booking cancelled (same transaction)
            await bookingRepository.update(
                data.bookingId,
                { status: CANCELLED },
                transaction
            );

            // TODO: publish event -> Flight service releases seats
            throw new AppError(
                "Payment window expired",
                StatusCodes.BAD_REQUEST
            );
        }

        // 4️⃣ Validate amount
        if (bookingDetails.totalCost !== (+data.totalCost) ) {
            throw new AppError(
                `Amount mismatch.correct amount is ${data.totalCost}`,
                StatusCodes.BAD_REQUEST
            );
        }

        // 5️⃣ Validate user
        if (bookingDetails.userId !== (+data.userId) ) {
            throw new AppError(
                "User not authorized to make payment",
                StatusCodes.UNAUTHORIZED
            );
        }

        // 6️⃣ Mark booking as BOOKED
        const booking = await bookingRepository.update(
            data.bookingId,
            { status: BOOKED },
            transaction
        );

        // 7️⃣ Commit transaction
        await transaction.commit();

        // 8️⃣ Fire async notification (non-blocking)
        // Queue.sendData({
        //     recepientEmail: bookingDetails.userEmail,
        //     subject: "Flight booked",
        //     text: `Your booking ${booking.id} is confirmed`
        // });

        return booking;

    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}


// async function makePayment(data) {
//     const transaction = await db.sequelize.transaction();
//     try {
//         //Get booking details using booking repository.
//         const bookingDetails = await bookingRepository.get(data.bookingId, transaction);

//         //--------- Write the logic for "how much time should payment making portal should be up" ---------------

//         //Check if the booking status is cancelled.
//         if(bookingDetails.status == CANCELLED) {
//             throw new AppError("The booking has expired", StatusCodes.BAD_REQUEST);
//         }

//         //Compute the booking time and current time.
//         const bookingTime = new Date(bookingDetails.createdAt);
//         const currentTime = new Date();

//         //Constraint on time.
//         if(currentTime - bookingTime > 1000 * 60 * 5) {
//             // [TASK] After canceling the booking bring all the seats back to flight.
//             await cancelBooking(data.bookingId);
//             throw new AppError("The booking has expired", StatusCodes.BAD_REQUEST);
//         }

//         //check weather the booking amount is equal to amount paid
//         if (bookingDetails.totalCost != data.totalCost) {
//             throw new AppError("Amount paid does not match the total cost", StatusCodes.BAD_REQUEST);
//         }

//         //check weather the user is the same who created the booking.
//         if (bookingDetails.userId != data.userId) {
//             throw new AppError("User not authorized to make payment", StatusCodes.UNAUTHORIZED);
//         }

//         // If everything goes well then set the status of booking to "BOOKED".
//         const booking = await bookingRepository.update(data.bookingId, {status : BOOKED}, transaction);

//         await transaction.commit();

//         Queue.sendData({
//             recepientEmail: `vivektarun1234@gmail.com`,
//             subject: `Flight booked`,
//             text: `Booking successfully done for the flight ${flightData.flightNumber}`
//         });
        
//         return booking;
//     } catch (error) {
//         await transaction.rollback();
//         throw error;
//     }
// }


// Used by: payment timeout job / user cancel / system cleanup
async function cancelBooking(bookingId) {
    const transaction = await db.sequelize.transaction();

    try {
        // 1️⃣ Fetch booking inside transaction
        const bookingDetails = await bookingRepository.get(
            bookingId,
            transaction
        );

        // 2️⃣ Idempotency: already cancelled
        if (bookingDetails.status === CANCELLED) {
            await transaction.commit();
            return true;
        }

        // 3️⃣ Allow cancellation ONLY from PENDING
        if (bookingDetails.status !== PENDING) {
            throw new AppError(
                "Only pending bookings can be cancelled",
                StatusCodes.BAD_REQUEST
            );
        }

        // 4️⃣ Mark booking as CANCELLED (single source of truth)
        await bookingRepository.update(
            bookingId,
            { status: CANCELLED },  
            transaction
        );

        // 5️⃣ Commit DB first (VERY IMPORTANT)
        await transaction.commit();

        // 6️⃣ Publish event to release seats (async, decoupled)
        // Queue.sendData({
        //     type: "RELEASE_SEATS",
        //     data: {
        //         flightId: bookingDetails.flightId,
        //         seats: bookingDetails.noOfSeats
        //     }
        // });

        return true;

    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

module.exports = {
    createBooking,
    makePayment,
    cancelBooking
};