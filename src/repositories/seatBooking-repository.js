const CrudRepository = require("./crud-repository");
const {SeatBooking} = require('../models');

class SeatBookingRepository extends CrudRepository{
    constructor(){
        super(SeatBooking);
    }
    async bulkCreate(data, transaction) {
        return await SeatBooking.bulkCreate(data, { transaction });
    }
    async getSeats(bookingId){
        const response =await SeatBooking.findAll({
            where : {
                bookingId :bookingId
            },
            attributes: ['seatId'] 
        });

        const seatsIds = response.map(seat => seat.seatId);
        return seatsIds;
    }

    async getOccupiedSeats(flightId) {
    const response = await SeatBooking.findAll({
        where: {
            flightId: flightId
        }
    });
    return response;
}
}

module.exports=SeatBookingRepository;



