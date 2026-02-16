const { StatusCodes } = require('http-status-codes');
const { ErrorResponse } = require('../utils/common');
const AppError = require('../utils/errors/app-error');

function validateSeatBookingRequest(req, res, next) {
    if (!req.body.bookingId) {
        ErrorResponse.message = 'Something went wrong while booking seat';
        ErrorResponse.error = new AppError(
            ['bookingId not found in the incoming request in the correct form'],
            StatusCodes.BAD_REQUEST
        );
        return res.status(StatusCodes.BAD_REQUEST).json(ErrorResponse);
    }
    console.log("Seats in request body:", req.body.seats); // Debugging line
    if (!Array.isArray(req.body.seats) || req.body.seats.length === 0) {
        ErrorResponse.message = 'Something went wrong while booking seat';
        ErrorResponse.error = new AppError(
            ['seats array not found or empty in the incoming request'],
            StatusCodes.BAD_REQUEST
        );
        return res.status(StatusCodes.BAD_REQUEST).json(ErrorResponse);
    }
    next();
}

module.exports = {
    validateSeatBookingRequest
};
