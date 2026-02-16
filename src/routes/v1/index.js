const express = require('express');

const { InfoController } = require('../../controllers');

const BookingRoutes = require('./booking-routes');
const SeatRoutes = require('./seat-routes');

const router = express.Router();


router.get('/info', InfoController.info);
router.use('/bookings', BookingRoutes);
router.use('/seats', SeatRoutes);

module.exports = router;