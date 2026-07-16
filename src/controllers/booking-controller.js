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

        // 1. THE GUARD (Check and Lock)
        if (inMemDb[idempotencyKey]) {
            const cache = inMemDb[idempotencyKey];
            
            // If another thread is currently processing this exact key:
            if (cache.status === 'PROCESSING') {
                return res.status(StatusCodes.CONFLICT).json({ 
                    message: 'Payment is currently being processed. Please wait.' 
                });
            }
            // If the payment already succeeded previously, return the exact same cached response:
            if (cache.status === 'SUCCESS') {
                const enrichedResponse = {
                ...cache.response,
                message: 'Successfully completed the request (Served from Idempotency Cache)',
                meta: {
                    isCached: true,
                    note: "This payment was already processed. No new database transaction occurred."
                }  };

                return res.status(StatusCodes.OK).json(enrichedResponse);

          


            }
        }

        // Atomically claim the lock
        inMemDb[idempotencyKey] = { status: 'PROCESSING' };

        try {
            // 2. THE PROCESS (Side Effect)
            const response = await BookingService.makePayment({
                totalCost : req.body.totalCost,
                userId: req.body.userId,
                bookingId: req.body.bookingId
            });

            // Prepare the response
            const finalResponse = { ...SuccessResponse, data: response };

            // 3. THE PERSIST (Save Result)
            inMemDb[idempotencyKey] = { 
                status: 'SUCCESS', 
                response: finalResponse 
            };

            return res.status(StatusCodes.OK).json(finalResponse);

        } catch (paymentError) {
            // CRITICAL: If processing fails, release the lock so the user can try again!
            delete inMemDb[idempotencyKey];
            throw paymentError; // Pass down to the outer catch block
        }

    } catch (error) {
        ErrorResponse.error = error;
        return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json(ErrorResponse);
    }
}

module.exports = {
    createBooking,
    makePayment
};


