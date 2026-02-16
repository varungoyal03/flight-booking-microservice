const express = require('express');
const { SeatController } = require('../../controllers');
const { SeatMiddleware } = require('../../middlewares');

const router = express.Router();

// POST /api/v1/seats/book
router.post('/book', SeatMiddleware.validateSeatBookingRequest, SeatController.bookSeats);

module.exports = router;
