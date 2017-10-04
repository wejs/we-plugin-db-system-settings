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

  plugin.hooks.on('we:after:routes:bind', (we, done)=> {
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

  plugin.hooks.on('we:after:routes:bind', (we, done)=> {
    plugin.writeConfigInFile(done);
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

  plugin.hooks.on('we:server:after:start', (we, done)=> {
    // your code here ...
    done();
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
    fs.writeFile(file, JSON.stringify(plugin.we.systemSettings), {
      flag: 'w'
    }, cb);
  }

  plugin.watchConfigFile = function watchConfigFile(done) {
    fs.watchFile('message.text', (curr, prev) => {
      console.log(`the current mtime is: ${curr.mtime}`);
      console.log(`the previous mtime was: ${prev.mtime}`);
    });

    plugin.configWatcher = chokidar.watch(file, {
      ignored: /[\/\\]\./,
      persistent: true
    });

    plugin.configWatcher.on('change', ()=> {
      plugin.reloadConfigFromFile();
    });

    done();
  }

  plugin.reloadConfigFromFile = function reloadConfigFromFile() {
    const we = plugin.we;

    fs.watchFile('message.text', (curr, prev) => {
      console.log(`the current mtime is: ${curr.mtime}`);
      console.log(`the previous mtime was: ${prev.mtime}`);
    });

    fs.readFile(file, (err, data)=> {
      if (err) {
        we.log.error('we-plugin-user-settings:Error on read config file', err);
        return;
      }

      try {
        we.systemSettings = JSON.parse(data);
      } catch(e) {
        we.log.error('we-plugin-user-settings:Error on parse config file', e);
      }

    });
  }

  return plugin;
};