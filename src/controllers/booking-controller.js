const { StatusCodes } = require('http-status-codes');
const { SuccessResponse, ErrorResponse } = require('../utils/common');
const { BookingService } = require('../services');


const inMemDb = {};

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

async function makePayment(req, res) {
    try {
        const idempotencyKey = req.headers['x-idempotency-key'];

        if(!idempotencyKey) {
            return res.status(StatusCodes.BAD_REQUEST).json({message: 'Idempotency key is missing'});
        }

        if(inMemDb[idempotencyKey]) {
            return res.status(StatusCodes.BAD_REQUEST).json({message: 'Cannot retry on a successful payment'});
        }

        const response = await BookingService.makePayment({
            totalCost : req.body.totalCost,
            userId: req.body.userId,
            bookingId: req.body.bookingId
        });

        inMemDb[idempotencyKey] = idempotencyKey;

        SuccessResponse.data = response;
        return res.status(StatusCodes.OK).json(SuccessResponse);

    } catch (error) {
        ErrorResponse.error = error;
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(ErrorResponse);
    }
}


module.exports = {
    createBooking,
    makePayment
};