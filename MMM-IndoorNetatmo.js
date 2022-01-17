/* Magic Mirror
 * Module: Netatmo
 *
 * Based on code from Christopher Fenner http://github.com/CFenner
 * MIT Licensed.
 */
 /* global $, Q, moment, Module, Log */
Module.register('MMM-IndoorNetatmo', {
  // default config,
  defaults: {
    refreshToken: null,
    updateInterval: 5, // every 5 minutes, refresh interval on netatmo is 10 minutes
    showHumidity: false,
    api: {
      base: 'https://api.netatmo.com/',
      authEndpoint: 'oauth2/token',
      authPayload: 'grant_type=refresh_token&refresh_token={0}&client_id={1}&client_secret={2}',
      dataEndpoint: 'api/getstationsdata',
      dataPayload: 'access_token={0}'
    }
  },
  // init method
  start: function() {
    Log.info('Starting module: ' + this.name);
    this.α = 0;
    // set interval for reload timer
    this.t = this.config.updateInterval * 60 * 1000 / 360;
    // run timer
    this.updateLoad();
  },
  updateLoad: function() {
    Log.info(this.name + " refresh triggered");
    var that = this;
    return Q.fcall(
      this.load.token.bind(that),
    ).then(
      this.load.data.bind(that),
    ).then(
      this.sendNotifications.bind(that)
    ).catch(function (error) {
		Log.error(this.name + " - Error - " + " " + error.responseText);
    }).done(
      this.updateWait.bind(that)
    );
  },
  updateWait: function() {
    this.α++;
    this.α %= 360;
    var r = (this.α * Math.PI / 180);
    var x = Math.sin(r) * 125;
    var y = Math.cos(r) * -125;
    var mid = (this.α > 180) ? 1 : 0;
    var anim = 'M 0 0 v -125 A 125 125 1 ' +
       mid + ' 1 ' +
       x + ' ' +
       y + ' z';

    var loader = $('.netatmo .loadTimer .loader');
    if (loader.length > 0) {
      loader.attr('d', anim);
    }
    var border = $('.netatmo .loadTimer .border');
    if (border.length > 0) {
      border.attr('d', anim);
    }
    if (r === 0) {
      // refresh data
      this.updateLoad();
    } else {
      // wait further
      setTimeout(this.updateWait.bind(this), this.t);
    }
  },
  load: {
    token: function() {
      Log.info(this.name + " recieving access token");

      return Q($.ajax({
        type: 'POST',
        url: this.config.api.base + this.config.api.authEndpoint,
        data: this.config.api.authPayload.format(
            this.config.refreshToken,
            this.config.clientId,
            this.config.clientSecret)
      }));
    },
    data: function(data) {
      Log.info(this.name + " token loaded " + data.access_token);
      this.config.refreshToken = data.refresh_token;
      // call for station data
      return Q($.ajax({
        url: this.config.api.base + this.config.api.dataEndpoint,
        data: this.config.api.dataPayload.format(data.access_token)
      }));
    }
  },
  sendNotifications: function(data) {
    var device = data.body.devices[0];
    this.lastUpdate = device.dashboard_data.time_utc;
    this.sendNotification('INDOOR_TEMPERATURE', device.dashboard_data.Temperature.toFixed(1) + '°');
    if (showHumidity === true) {
		this.sendNotification('INDOOR_HUMIDITY', device.dashboard_data.Humidity + '%');
	}
    return Q({});
  },
  getScripts: function() {
    return [
     'String.format.js',
     '//cdnjs.cloudflare.com/ajax/libs/jquery/2.2.2/jquery.js',
      'q.min.js'
    ];
  },

});
