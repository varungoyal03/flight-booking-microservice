const { StatusCodes } = require('http-status-codes');
const { SuccessResponse, ErrorResponse } = require('../utils/common');
const { BookingService } = require('../services');
const { error } = require('../utils/common/error-response');

//

async function createBooking(req, res) {
    try {
    
    console.log("Request body:", req.body); // Debugging line
        // Create booking
        const booking = await BookingService.createBooking({
            flightId: req.body.flightId,
            userId: req.body.userId,
            noOfSeats: req.body.noOfSeats,
        });

       
        SuccessResponse.data = booking;
        return res.status(StatusCodes.CREATED).json(SuccessResponse);
    } catch (error) {
        // Fallback for errors without a statusCode
        console.log("Error in creating booking", error);
        const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
        ErrorResponse.error = {
            message: error || "An unexpected error occurred",
            explanation: error.explanation || [],
        };
        return res.status(statusCode).json(ErrorResponse);
    }
}

//


module.exports = {
    createBooking
};