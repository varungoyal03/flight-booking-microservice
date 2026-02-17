
const { StatusCodes } = require('http-status-codes');
const { SuccessResponse, ErrorResponse } = require('../utils/common');
const { SeatBookingService } = require('../services');

const inMemBookingMap = new Map(); // bookingId -> true (in progress or done)


async function getSeatMap(req, res) {
    try {
        const response = await SeatBookingService.getSeatMap(req.params.id);
        SuccessResponse.data = response;
        return res.status(StatusCodes.OK).json(SuccessResponse);
    } catch (error) {
        ErrorResponse.error = error;
        return res.status(error.statusCode || 500).json(ErrorResponse);
    }
}

async function bookSeats(req, res) {
	const bookingId = req.body.bookingId;
	try {
		// In-memory idempotency: prevent duplicate processing
		if (inMemBookingMap.has(bookingId)) {
			SuccessResponse.data = { message: 'Booking is being processed or already processed (in-memory deduplication)' };
			return res.status(StatusCodes.ACCEPTED).json(SuccessResponse);
		}

		const result = await SeatBookingService.seatBooking({
			bookingId: bookingId,
			seats: req.body.seats
		});
		inMemBookingMap.set(bookingId, true); // Only set if booking succeeded
		SuccessResponse.data = result;
		return res.status(StatusCodes.OK).json(SuccessResponse);
	} catch (error) {
		ErrorResponse.error = error;
		ErrorResponse.message = error.message;
		return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json(ErrorResponse);
	}
}

module.exports = {
	bookSeats,
    getSeatMap
};
