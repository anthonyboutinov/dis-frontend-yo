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

    var queue = []; // an array of {query, callback}

    this.run = function() {

      var websocketQueue = []; // an array of query values
      var cachedDataQueue = []; // an array of cachedData

      for (var item in queue) {
        var result = this._runItem(item.query);
        websocketQueue.push(result.query);
        cachedDataQueue.push(result.cachedData);
      }

      $websocket.subscribe(
        {
          dataKind: 'config',
          list: websocketQueue
        },
        function(respond) {
          for (var data in respond) {

            // find and retrieve callback function for this item in `queue` array
            var indexInQueue = search1(item.query, queue);
            var callback = queue[indexInQueue].callback;

            // find and retrieve `cachedData` value for this item in `cachedDataQueue` array
            var cachedData = cachedDataQueue[indexInQueue];


            // if data is present in cache
            if (cachedData === null) {

              // if not already up to date
              if (data !== {status: 'alreadyUpToDate'}) {

                // update cache with new value
                alasql('UPDATE CONFIG_DATA SET DATA = ? WHERE PORTLET_ID = ? AND NAME = ?', [
                  data, portletId, configName
                ]);

                // and run callback function on this fresh data
                callback(data);

              }
              // if cached data IS up to date
              else {
                // run callback function on cached data
                callback(cachedData);
              }
            }
            // if there is no entry in the cache
            else {
              // write to cache
              alasql('INSERT INTO CONFIG_DATA (PORTLET_ID, NAME, VALUE) VALUES (?, ?, ?)', [
                portletId, configName, data
              ]);

              // run callback function on this data
              callback(data);
            }
          }
        }
      );

    };

    var search1 = function(needle, haystack) {
      return 0;
    }

    /*
      returns {
          query,
          cachedData
      }
    */
    this._runItem = function(query) {

      // // Check input parameters
      // if (typeof(portletId) !== 'string') {
      //   throw Error("Invalid argument: portletId must be a string");
      // }
      // if (typeof(configName) !== 'string') {
      //   throw Error("Invalid argument: configName must be a string");
      // }


      // проверить наличие данных в alasql
      var res = alasql('SELECT * FROM CONFIG_DATA WHERE PORTLET_ID = ? AND  NAME = ?', [query.portletId, query.configName]);
      // console.log(res);
      // console.log(typeof(res));

      var cachedData = null;

      if (res.count === 1) {
        // Add hash value to the query
        query.hash = res[0].HASH;
        // Get cached data
        cachedData = res[0].DATA;
      }

      return {
        query: query,
        cachedData: cachedData
      };

    };

    this.getConfig = function(query, callback) {
        queue.put({query:query, callback:callback});
    };

  });
