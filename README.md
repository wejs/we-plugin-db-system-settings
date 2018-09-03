# We.js DB System Settings plugin

Plugin to add support for save settings in database, usefull for dynamic configurations and required for some plugins

## Hooks and events

### HOOk system-settings:started
```
plugin.hooks.on('system-settings:started', function (we, done) {
  // your code here ...
  done();
});
```

### EVENT system-settings:updated:after
```
plugin.events.on('system-settings:updated:after', function (we) {
  // your code here ...
});
```

## Links

> * We.js site: http://wejs.org

## Copyright and license

Copyright Alberto Souza <contato@albertosouza.net> and contributors , under [the MIT license](https://github.com/wejs/we-core/blob/master/LICENSE.md).