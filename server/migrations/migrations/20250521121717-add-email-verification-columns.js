'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'isEmailVerified', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn('Users', 'emailVerificationToken', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'emailVerificationTokenExpires', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'isEmailVerified');
    await queryInterface.removeColumn('Users', 'emailVerificationToken');
    await queryInterface.removeColumn('Users', 'emailVerificationTokenExpires');
  }
};