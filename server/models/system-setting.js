/**
 * System settings model
 */

module.exports = function systemSettingModel(we) {
  const model = {
    definition: {
      key: {
        type: we.db.Sequelize.STRING,
        size: 255,
        allowNull: false,
        primaryKey: true,
        autoIncrement: false
      },
      value: {
        type: we.db.Sequelize.TEXT,
        allowNull: true,
        skipSanitizer: true
      },
      site: {
        type: we.db.Sequelize.STRING,
        size: 255,
        allowNull: true
      }
    },
    options: {
      tableName: 'systemSettings'
    }
  };

  return model;
};
