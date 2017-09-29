/**
 * We.js DB System Settings plugin
 */
module.exports = function loadPlugin(projectPath, Plugin) {
  const plugin = new Plugin(__dirname);

  // plugin configs
  plugin.setConfigs({
    permissions: {
      'system_settings_find': {
        'title': 'Load all database system settings'
      },
      'system_settings_update': {
        'title': 'Update all database system settings'
      },
    },
  });

  // plugin routes
  plugin.setRoutes({
    'get /system-settings': {
      'controller': 'system-setting',
      'model': 'system-setting',
      'action': 'get',
      'responseType': 'json'
    },
    'post /system-settings': {
      'controller': 'system-setting',
      'model': 'system-setting',
      'action': 'set',
      'responseType': 'json'
    },
  });

  /**
   * Plugin fast loader for speed up we.js projeto bootstrap
   *
   * @param  {Object}   we
   * @param {Function} done    callback
   */
  plugin.fastLoader = function fastLoader(we, done) {
    // controllers:
    we.controllers['system-setting'] = new we.class.Controller(require('./server/controllers/system-setting.js'));
    // models:
    we.db.modelsConfigs['system-setting'] = require('./server/models/system-setting.js')(we);

    done();
  }

  plugin.hooks.on('we:after:routes:bind', function(we, done) {
    // preload all system settings salved in db before the bootstrap:
    we.db.models['system-setting'].findAll()
    .then( (r)=> {
      we.systemSettings = {};

      if (r) {
        r.forEach( (setting)=> {
          we.systemSettings[setting.key] = setting.value;
        });
      }
      done();
      return null;
    })
    .catch(done);

    return null;
  });


  plugin.hooks.on('we-plugin-user-settings:getCurrentUserSettings', (ctx, done)=> {
    // ctx = {req: req,res: res,data: data}
    plugin.we.db.models['system-setting'].findAll()
    .then( (r)=> {
      ctx.data.systemSettings = {};

      if (r) {
        r.forEach( (setting)=> {
          ctx.data.systemSettings[setting.key] = setting.value;
        });
      }

      done();
      return null;
    })
    .catch(done);
  });


  return plugin;
};