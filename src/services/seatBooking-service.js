const axios = require('axios');
const db = require('../models');
const {BookingRepository,SeatBookingRepository}= require('../repositories');
const { ServerConfig } = require('../config');
const AppError = require('../utils/errors/app-error');
const { StatusCodes } = require('http-status-codes');
const { Enums } = require('../utils/common');
const { BOOKED, CANCELLED, INITIATED, PENDING } = Enums.BOOKING_STATUS;

const bookingRepo = new BookingRepository();
const seatBookingRepo = new SeatBookingRepository();

// 1. READ: Get Real-Time Seat Map
async function getSeatMap(flightId) {
    try {
        // Step A: Fetch Physical Layout from Flight Service
        const flightServiceUrl = `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${flightId}/seats`;
        const response = await axios.get(flightServiceUrl);
        const airplaneSeats = response.data.data; 

        // Step B: Fetch Occupied Seats from Local DB
        const occupiedSeats = await seatBookingRepo.getOccupiedSeats(flightId);
        const occupiedSeatIds = new Set(occupiedSeats.map(s => s.seatId));

        // Step C: Merge
        const seatMap = airplaneSeats.map(seat => {
            return {
                seatId: seat.id,
                row: seat.row,
                col: seat.col,
                type: seat.type,
                status: occupiedSeatIds.has(seat.id) ? 'BOOKED' : 'AVAILABLE'
            };
        });

        return seatMap;

    } catch (error) {
        console.error("Seat Map Error:", error);
        throw new AppError('Cannot fetch seat map', StatusCodes.INTERNAL_SERVER_ERROR);
    }
}

// data : {
//     bookingId,
//     seats
// }



async function seatBooking(data) {
      const transaction = await db.sequelize.transaction();

    try {

         const booking = await bookingRepo.get(data.bookingId, transaction);

         console.log("Booking details:", booking); // Debugging line
        if (booking.status !== PENDING) {
            throw new AppError(
                'Invalid booking state',
                StatusCodes.BAD_REQUEST
            );
        }

        if (data.seats.length !== booking.noOfSeats) {
            throw new AppError(
                'Seat count mismatch',
                StatusCodes.BAD_REQUEST
            );
        }

        const seatData = data.seats.map(seatId => ({
            seatId,
            bookingId: booking.id,
            flightId: booking.flightId
        }));
        console.log("Seat data to be inserted:", seatData); // Debugging line

        await seatBookingRepo.bulkCreate(seatData, transaction);

        await bookingRepo.update(
            booking.id,
            { status: BOOKED },
            transaction
        );

        await transaction.commit();

        return { message: 'Seats booked successfully' };

    } catch (error) {
        console.log("Error in seat booking:", error); // Debugging line
        await transaction.rollback();

        if (error.name === 'SequelizeUniqueConstraintError') {
            throw new AppError(
                'One or more seats are already taken',
                StatusCodes.CONFLICT
            );
        }
        
         if (error.name === 'SequelizeForeignKeyConstraintError') {
            throw new AppError(
                'Invalid seat selected',
                StatusCodes.BAD_REQUEST
            );
        }

        throw new AppError(
            'Something went wrong while seat booking',
            StatusCodes.INTERNAL_SERVER_ERROR
        );
    }
}

module.exports={
    seatBooking,
    getSeatMap

}



