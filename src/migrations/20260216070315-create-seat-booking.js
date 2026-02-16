'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('seatBookings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },

      seatId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Seats',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },

      bookingId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Bookings',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },

      flightId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Flights',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },

      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },

      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    //  Unique seat per flight
    await queryInterface.addConstraint('seatBookings', {
      fields: ['seatId', 'flightId'],
      type: 'unique',
      name: 'unique_seat_flight_constraint',
    });

  },

  async down(queryInterface) {
    await queryInterface.dropTable('seatBookings');
  },
};
