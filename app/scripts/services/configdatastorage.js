'use strict';

/**
 * @ngdoc service
 * @name dis1App.configDataStorage
 * @description
 * # configDataStorage
 * Service in the dis1App.
 */
angular.module('dis1App')
  .service('configDataStorage', function ($websocket) {

    alasql('CREATE INDEXEDDB DATABASE IF NOT EXISTS APP; \
           ATTACH INDEXEDDB DATABASE APP; \
           CREATE TABLE IF NOT EXISTS APP.CONFIG_DATA (ID_CONFIG_DATA, PORTLET_ID, NAME, DATA, HASH);');

    var queue = []; // an array of {query, [callback]}

    this.run = function() {

      var websocketQueue = []; // an array of query values
      var cachedDataQueue = []; // an array of cachedData

      var index, length;
      for (index = 0, length = queue.length; index < length; index++) {
        var item = queue[index];
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
          var index, length;
          for (index = 0, length = respond.length; index < length; index++) {
            var data = respond[index];

            // find and retrieve callback function for this item in `queue` array
            var indexInQueue = this._indexOfProperty(item.query, 'query', queue);
            var callback = queue[indexInQueue].callback;

            // find and retrieve `cachedData` value for this item in `cachedDataQueue` array
            var cachedData = cachedDataQueue[indexInQueue];


            // if data is present in cache
            if (cachedData === null) {

              // if not already up to date
              if (data !== {status: 'alreadyUpToDate'}) {

                // update cache with new value
                alasql('UPDATE APP.CONFIG_DATA SET DATA = ?, HASH = ? WHERE PORTLET_ID = ? AND NAME = ?', [
                  data.DATA, data.HASH, portletId, configName
                ]);

                // and run callback function on this fresh data
                callback(data.DATA);

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
              alasql('INSERT INTO APP.CONFIG_DATA (PORTLET_ID, NAME, DATA, HASH) VALUES (?, ?, ?, ?)', [
                portletId, configName, data.DATA, data.HASH
              ]);

              // run callback function on this data
              callback(data.DATA);
            }
          }
        }
      );

    };

    this._indexOfProperty = function(needle, propertyName, haystack) {
      var index, length;
      for (index = 0, length = haystack.length; index < length; index++) {
        if (haystack[index][propertyName] === needle) {
          return index;
        }
      }
      return -1;
    }

    this._runItem = function(query) {
      console.log("_runItem:");
      console.log(query);

      // проверить наличие данных в alasql
      var res = alasql('SELECT * FROM APP.CONFIG_DATA WHERE PORTLET_ID = ? AND  NAME = ?', [query.portletId, query.configName]);
      console.log(res);
      console.log(typeof(res));

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

      // // Check input parameters
      // if (typeof(portletId) !== 'string') {
      //   throw Error("Invalid argument: portletId must be a string");
      // }
      // if (typeof(configName) !== 'string') {
      //   throw Error("Invalid argument: configName must be a string");
      // }

      // find this query
      var index = this._indexOfProperty(query, 'query', queue);

      if (index > -1) {
        // if already present, add another callback function to it
        queue[index].callback.push(callback);
      } else {
        // if no such query was found in the queye already, add it to the queue with an array of a single callback
        queue.push(
          {
            query: query,
            callback: [callback]
          }
        );
      }

      console.log(queue);

    };

  });
