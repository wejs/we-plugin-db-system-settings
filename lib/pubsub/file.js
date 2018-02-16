const fs = require('fs'),
  path = require('path'),
  chokidar = require('chokidar');

function FilePubSub(we) {
  this.we = we;
  this.file = path.join(we.projectPath, 'files/db-settings-watch-file.txt');
}

FilePubSub.prototype = {
  since: new Date().getTime(),
  file: null,

  /**
   * Initializer
   *
   * @param  {Function} cb Callback]
   */
  init(cb) {
    const we = this.we;
    const self = this;

    we.utils.async.series([
      function (done) {
        self.loadConfigs(done);
      },
      function (done) {
        self.publish(done);
      },
      function (done) {
        self.subscribe(done);
      },
      function (done) {
        we.hooks.trigger('system-settings:started', we, done);
      }
    ], cb);
  },

  // - Pubsub
  publish(cb) {
    this.since = new Date().getTime();
    this.updateWatchedFile(cb);
  },
  subscribe(cb) {
    if (!cb) cb = function(){}; // cb is optional
    if (this.configWatcher) return cb();
    // watch changes
    this.watchUpdateFile(cb);
  },

  // - Methods:

  loadConfigs(done) {
    const we = this.we;

    we.db.models['system-setting']
    .findAll({
      raw: true
    })
    .then( (r)=> {
      if (!we.systemSettings) we.systemSettings = {};

      if (r) {
        r.forEach( (setting)=> {
          we.systemSettings[setting.key] = setting.value;
        });
      }

      done(null, we.systemSettings);
      return null;
    })
    .catch(done);
    return null;
  },

  updateWatchedFile(cb) {
    if (!cb) cb = function(){}; // cb is optional
    if (!this.file) return cb();

    fs.writeFile(this.file, this.since, {
      flag: 'w'
    }, cb);
  },

  watchUpdateFile(cb) {
    const self = this;
    if (!cb) cb = function(){}; // cb is optional

    this.configWatcher = chokidar.watch(this.file, {
      persistent: true
    });

    this.configWatcher.on('change', ()=> {
      if (self.throttle) clearTimeout(self.throttle);

      self.throttle = setTimeout( ()=> {
        self.updateRuntimeConfig();
      }, 150);
    });

    cb();
  },

  updateRuntimeConfig() {
    const we = this.we,
      self = this;

    we.utils.async.series([
      function (done) {
        self.loadConfigs(done);
      },
      function (done) {
        we.events.emit('system-settings:updated:after', we);
        done();
      }
    ]);
  },

  configWatcher: null,
  throttle: null
};


module.exports = FilePubSub;