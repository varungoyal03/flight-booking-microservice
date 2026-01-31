const express = require('express');

const {BookingController} = require('../../controllers');
const { BookingMiddleware } = require('../../middlewares');

const router = express.Router();

// Route to create booking.
router.post('/',BookingMiddleware.validateCreateBookingRequest, BookingController.createBooking);
// Route to make booking.
// api/v1/bookings/payments POST
router.post('/payments',BookingMiddleware.validateMakePaymentRequest,BookingController.makePayment);

module.exports = router;