/**
 * We.js DB System Settings plugin
 */

module.exports = function loadPlugin(projectPath, Plugin) {
  const plugin = new Plugin(__dirname);

  plugin.we.systemSettings = {};

  // plugin configs
  plugin.setConfigs({
    systemSettingsPubSubStrategy: 'file',
    permissions: {
      'system_settings_find': {
        'title': 'Load all database system settings'
      },
      'system_settings_update': {
        'title': 'Update all database system settings'
      },
    },
    publicSystemSettings: {
      siteName: true,
      siteFooter: true,
      siteDaysOfService: true,
      siteDescription: true,
      iconId: true,
      iconUrl: true,
      iconUrlMedium: true,
      iconUrlOriginal: true,
      iconUrlThumbnail: true,
      logoId: true,
      logoUrl: true,
      logoUrlMedium: true,
      logoUrlOriginal: true,
      logoUrlThumbnail: true,
      googleAnalyticsID: true,
      emailContact: true
    }
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

  plugin.hooks.on('we:after:load:plugins', (we, done)=> {
    const st = we.config.systemSettingsPubSubStrategy;

    if (!st) return done();
    const Pubsub = require('./lib/pubsub/'+st);
    plugin.pubsub = new Pubsub(we);

    done();
  });

  plugin.hooks.on('we:models:ready', (we, done)=> {
    if (!plugin.pubsub) return done();
    plugin.pubsub.init(done);
  });

  plugin.hooks.on('we-plugin-user-settings:getCurrentUserSettings', (ctx, done)=> {
    const we = plugin.we,
      c = we.config;

    // ctx = {req: req,res: res,data: data}
    ctx.data.systemSettings = {};

    if (we.acl.canStatic('system_settings_find', ctx.req.userRoleNames)) {
      ctx.data.systemSettings = we.systemSettings;
    } else {
      // filter to get only public system settings if user cant get all system settings:
      for (let name in c.publicSystemSettings) {
        if (!c.publicSystemSettings[name]) continue;
        ctx.data.systemSettings[name] = we.systemSettings[name];
      }
    }

    done();
  });

  plugin.setConfigs = function setConfigs(newCfgs, cb) {
    const we = plugin.we,
      pubsub = plugin.pubsub,
      Model = we.db.models['system-setting'];

    we.utils.async.forEachOf(newCfgs, (value, key, next)=> {
      Model.findOne({
        where: { key: key }
      })
      .then( (r)=> {
        if (r) {
          return r.updateAttributes({
            value: value
          });
        } else {
          return Model.create({
            value: value,
            key: key
          });
        }
      })
      .then( ()=> {
        we.systemSettings[key] = value; // update runtime setting
        next();
        return null;
      })
      .catch(next);
    }, (err)=> {
      if (err) return cb(err);

      pubsub.publish( (err)=> {
        cb(err, we.systemSettings);
      });
    });
  }

  return plugin;
};