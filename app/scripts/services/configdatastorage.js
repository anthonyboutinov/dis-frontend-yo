'use strict';

/**
 * @ngdoc service
 * @name dis1App.configDataStorage
 * @description
 * # configDataStorage
 * Service in the dis1App.
 */
angular.module('dis1App')
  .service('configDataStorage', function ($websocket, alasql) {

    this.getConfig = function(options, callback) {

      var portletId = options.portletId;
      var configName = options.configName;

      // // Check input parameters
      // if (typeof(portletId) !== 'string') {
      //   throw Error("Invalid argument: portletId must be a string");
      // }
      // if (typeof(configName) !== 'string') {
      //   throw Error("Invalid argument: configName must be a string");
      // }


      // проверить наличие данных в alasql
      var res = alasql('SELECT * FROM CONFIG_DATA WHERE PORTLET_ID = ? AND  NAME = ?', [portletId, configName]);
      // console.log(res);
      // console.log(typeof(res));

      if (res.count === 0) {

        $websocket.subscribe(
          {
            portletId: portletId,
            configName: configName
          },

          function(response) {
            alasql('INSERT INTO CONFIG_DATA (PORTLET_ID, NAME, VALUE) VALUES (?, ?, ?)', [
              portletId, configName, response
            ]);
            callback(response);
          }
        );

      }

      if (res.count === 1) {
        $websocket.subscribe(
          {
            portletId: portletId,
            configName: configName,
            hash: res[0].HASH
          },

          function(response) {
            if (response !== {status: 'alreadyUpToDate'}) {
              alasql('UPDATE CONFIG_DATA SET VALUE = ? WHERE PORTLET_ID = ? AND NAME = ?', [
                response, portletId, configName
              ]);
            }
            callback(res[0].DATA);
          }
        );

      }
    };

  });
