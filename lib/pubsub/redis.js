const redis = require('redis');

function RedisPubSub(we) {
  this.we = we;
  this.key = we.config.hostname;
}

RedisPubSub.prototype = {
  redisClient: null,

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
        self.createRedisConnection(done);
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
    this.client.publish(this.key, JSON.stringify(this.we.systemSettings));
    cb();
  },
  subscribe(cb) {
    if (!cb) cb = function(){}; // cb is optional
    if (this.configWatcher) return cb();

    const self = this;

    // watch changes
    this.subscriber.subscribe(this.key);
    this.subscriber.on('message', function(channel, message) {
      if (channel === self.key) {
        self.loadConfigFromMessage(message);
      }
    });
    cb();
  },

  createRedisConnection(done) {
    this.client = redis.createClient({
      url: process.env.REDIS_URL
    });
    this.subscriber = redis.createClient({
      url: process.env.REDIS_URL
    });
    done();
  },

  loadConfigFromMessage(message) {
    const we = this.we;

    try {
      we.systemSettings = JSON.parse(message);
      we.events.emit('system-settings:updated:after', we);
    } catch (e) {
      this.we.log.error(e);
    }
  },

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
  }
};

module.exports = RedisPubSub;