const express = require('express');

const {BookingController} = require('../../controllers');
const { BookingMiddleware } = require('../../middlewares');

const router = express.Router();

// Route to create booking.
router.post('/',BookingMiddleware.validateCreateBookingRequest, BookingController.createBooking);
// Route to make booking.
// router.post('/payments', BookingController.makePayment);

module.exports = router;