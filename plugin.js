/**
 * We.js DB System Settings plugin
 */

const fs = require('fs'),
  chokidar = require('chokidar');

module.exports = function loadPlugin(projectPath, Plugin) {
  const plugin = new Plugin(__dirname);
  const file = plugin.we.projectPath+'/files/db-settings-watch-file.txt';

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

  plugin.hooks.on('we:models:ready', (we, done)=> {
    // preload all system settings salved in db before the bootstrap:
    we.db.models['system-setting'].findAll()
    .then( (r)=> {
      we.systemSettings = {};

      if (r) {
        r.forEach( (setting)=> {
          we.systemSettings[setting.key] = setting.value;
        });
      }

      plugin.hooks.trigger('system-settings:started', we, done);
      return null;
    })
    .catch(done);
    return null;
  });

  plugin.hooks.on('we:after:load:plugins', (we, done)=> {
    plugin.writeConfigInFile(done);
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

  plugin.hooks.on('we:server:after:start', (we, done)=> {
    plugin.watchConfigFile(done);
  });

  plugin.reloadCachedSettings = function reloadCachedSettings(done) {
    if (!done) done = function(){};

    const we = plugin.we;
    // preload all system settings salved in db before the bootstrap:
    we.db.models['system-setting']
    .findAll()
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
  }

  plugin.writeConfigInFile = function writeConfigInFile(cb) {
    if (!cb) cb = function(){};

    fs.writeFile(file, JSON.stringify(plugin.we.systemSettings), {
      flag: 'w'
    }, cb);
  }

  plugin.watchConfigFile = function watchConfigFile(done) {
    plugin.configWatcher = chokidar.watch(file, {
      persistent: true
    });

    plugin.configWatcher.on('change', ()=> {
      setTimeout(()=> {
        plugin.reloadConfigFromFile();
      }, 50);
    });

    done();
  }

  plugin.trys = 0;

  plugin.reloadConfigFromFile = function reloadConfigFromFile() {
    plugin.trys++;

    const we = plugin.we;
    fs.readFile(file, 'utf8', (err, data)=> {
      if (err) {
        we.log.error('we-plugin-db-system-settings:Error on read config file', err);
        return;
      }

      if (!data) {
        // if not get any data then the file are in write process ... try again with some delay:
        setTimeout( ()=> {
          plugin.reloadConfigFromFile();
        }, 100);

        return;
      }

      plugin.trys = 0;

      try {
        we.systemSettings = JSON.parse(data);
        plugin.events.emit('system-settings:updated:after', we);
      } catch(e) {
        we.log.error('we-plugin-db-system-settings:Error on parse config file', e);
      }

    });
  }

  plugin.setConfigs = function setConfigs(newCfgs, cb) {
    const we = plugin.we;
    const Model = we.db.models['system-setting'];

    we.utils.async.forEachOf(newCfgs, (value, key, next)=> {
      Model.findOne({
        where: { key: key }
      })
      .then( (r)=> {
        if (r) {
          return r.updateAttributes({
            value: value
          })
          .then( ()=> {
            next();
            return null;
          });
        } else {
          return Model.create({
            value: value,
            key: key
          })
          .then( ()=> {
            next();
            return null;
          });
        }
      })
      .catch(next);
    }, (err)=> {
      if (err) return cb(err);

      const updatedSettings = {};

      Model.findAll({ raw: true })
      .then( (r)=> {
        if (r) {
          r.forEach( (setting)=> {
            updatedSettings[setting.key] = setting.value;
          });

          we.systemSettings = updatedSettings;
          // update config sync file:
          we.plugins['we-plugin-db-system-settings'].writeConfigInFile();
        }

        cb(null, updatedSettings);
        return null;
      })
      .catch(cb);
    });
  }

  return plugin;
};