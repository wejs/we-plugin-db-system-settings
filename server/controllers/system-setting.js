/**
 * System settings controller
 */

module.exports = {
  /**
   * Get all system settings
   *
   * @param  {Object} req Express.js request
   * @param  {Object} res Express.js response
   */
  get(req, res) {
    if (!req.we.acl.canStatic('system_settings_find', req.userRoleNames)) {
      return res.forbidden();
    }

    const Model = req.we.db.models['system-setting'];
    const updatedSettings = {};

    Model.findAll()
    .then( (r)=> {
      if (r) {
        r.forEach( (setting)=> {
          updatedSettings[setting.key] = setting.value;
        });
      }

      res.status(200).send({ settings: updatedSettings });
      return null;
    })
    .catch(res.queryError);
  },

  /**
   * Set one or many system settings
   *
   * @param  {Object} req Express.js request
   * @param  {Object} res Express.js response
   */
  set(req, res) {
    if (!req.we.acl.canStatic('system_settings_update', req.userRoleNames)) {
      return res.forbidden();
    }

    req.we.plugins['we-plugin-db-system-settings']
    .setConfigs(req.body, (err, updatedSettings)=> {
      if (err) return res.queryError(err);
      res.status(200).send({ settings: updatedSettings });
    });
  }
};