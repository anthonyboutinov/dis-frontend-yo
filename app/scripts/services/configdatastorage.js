'use strict';

/**
 * @ngdoc service
 * @name dis1App.configDataStorage
 * @description
 * # configDataStorage
 * Service in the dis1App.
 */
angular.module('dis1App')
  .run(function(configDataStorage) {

  alasql.options.angularjs = true;
  alasql.options.errorlog = false; // Log or throw error
  alasql.options.casesensitive = true; // Table and column names are case sensitive and converted to lower-case
  alasql.options.logprompt = true; // Print SQL at log
  alasql.options.columnlookup = 10; // How many rows to lookup to define columns


    alasql('CREATE INDEXEDDB DATABASE IF NOT EXISTS APP; \
            ATTACH INDEXEDDB DATABASE APP;', [], function() {
              console.log(new Date() + ' alasql: database APP has been attached');

                alasql('USE APP;\
                  CREATE TABLE IF NOT EXISTS CONFIG ( \
                  ID_CONFIG INT AUTO_INCREMENT, \
                  PAGE_ID STRING NOT NULL, \
                  NAME STRING NOT NULL, \
                  DATA JSON NOT NULL, \
                  HASH STRING NOT NULL, \
                  PRIMARY KEY (ID_CONFIG), \
                  UNIQUE(PAGE_ID, NAME) \
                );');
                console.log(new Date() + ' alasql: database APP has been selected, table CONFIG has been created');
                configDataStorage.run();

    });
    console.log(new Date() + ' alasql: init request sent');

  })
  .service('configDataStorage', function (sharedWebSocket, deepEquals) {

    this.resetTable = function() {
      this.drop();
      this.createTable();
      this.populate();
    };

    this.drop = function() {
      alasql('DROP TABLE CONFIG;');
    };

    this.populate = function() {
      alasql('INSERT INTO CONFIG (PAGE_ID, NAME, DATA, HASH) VALUES (?, ?, ?, ?)', [
        '222', 'test', {width: '100%', height: '400px'}, 'hashValueComputedOnServer'
      ]);
      alasql('INSERT INTO CONFIG (PAGE_ID, NAME, DATA, HASH) VALUES (?, ?, ?, ?)', [
        'main', 'styling', {
          h1: {
            color: '#66afe9'
          }
        }, 'hashValueComputedOnServer'
      ]);
    };

    this.test = function() {
      this.subscribeToConfig({portletId: 'notCachedPage', configName: 'notCachedConfig'}, function(value){alert(value);});
      // this.subscribeToConfig({portletId: 'main', configName: 'jumbotron-h1'}, function(value){alert(value);});
      this.subscribeToConfig({portletId: '222', configName: 'test'}, function(value){alert(value);});
      this.run();
    };

    this.createTable = function() {
      var res = alasql('CREATE TABLE IF NOT EXISTS CONFIG ( \
        ID_CONFIG INT AUTO_INCREMENT, \
        PAGE_ID STRING NOT NULL, \
        NAME STRING NOT NULL, \
        DATA JSON NOT NULL, \
        HASH STRING NOT NULL, \
        PRIMARY KEY (ID_CONFIG), \
        UNIQUE(PAGE_ID, NAME) \
      );');
      if (res === 0) {
        console.log('alasql: table CONFIG is already present');
      } else {
        console.log('alasql: table CONFIG has been created');
      }
    };

    var doWaitForRunCall = true;

    this.doWaitForRun = function() {
      doWaitForRunCall = true;
    }

    var queue = []; // an array of {query, [callback]}

    this.run = function() {
      console.log("configDataStorage run event fired");
      doWaitForRunCall = false;

      var websocketQueue = []; // an array of query values
      var callbacksQueue = [];
      var cachedDataQueue = []; // an array of cachedData

      var index, length;
      for (index = 0, length = queue.length; index < length; index++) {
        var item = queue[index];

        // create scope so that the correct `index` value is used in callback funciton
        (function(index, item) {

          _runItem(item.query, function(result) {
            console.log(" _runItem callback fired with result:");
            console.log(result);
            websocketQueue.push(result.query);
            callbacksQueue.push(item.callback);
            cachedDataQueue.push(result.cachedData);

            // when all are processed, proceed to `subscribe`
            if (index === length - 1) {
              queue = [];
              _subscribe(websocketQueue, callbacksQueue, cachedDataQueue);
            }
          });

        })(index, item); // eof scope
      }

    };

    var _subscribe = function(websocketQueue, callbacksQueue, cachedDataQueue) {

        _fireCallbacksForCachedData(callbacksQueue, cachedDataQueue);
        _subscribeWithWebSocket(websocketQueue, callbacksQueue, cachedDataQueue);

    };

    var _isConnectionEstablished = function() {
      var state = sharedWebSocket.readyState();
      if (state === 3 /* NO CONNECTION */) {
        return false;
      }
      return true;
    };

    var _subscribeWithWebSocket = function(websocketQueue, callbacksQueue, cachedDataQueue) {

      console.log("Subscribe with WebSocket:");
      console.log({
        dataKind: 'config',
        list: websocketQueue
      });

      sharedWebSocket.subscribe(
        {
          dataKind: 'config',
          list: websocketQueue
        },
        function(multirespond) {
          // multirespond is an array
          var index, length;
          for (index = 0, length = multirespond.length; index < length; index++) {
            var respond = multirespond[index];
            /*
              respond: {
                query,
                content: {DATA, HASH} либо строка со статусом
              }
            */

            // find and retrieve callback function for this item
            var indexInQueue = _indexOfProperty(respond.query, 'query', websocketQueue);
            var callback = callbacksQueue[indexInQueue];

            // find and retrieve `cachedData` value for this item in `cachedDataQueue` array
            var cachedData = cachedDataQueue[indexInQueue];


            // if data is present in cache
            if (cachedData === null) {

              // if not already up to date
              if (respond.content !== 'alreadyUpToDate') {

                // update cache with new value
                alasql('UPDATE CONFIG SET DATA = ?, HASH = ? WHERE PAGE_ID = ? AND NAME = ?', [
                  respond.content.DATA, respond.content.HASH, respond.PAGE_ID, respond.NAME
                ]);

                // and run callback function on this fresh data
                callback(respond.content.DATA);

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
              alasql('INSERT INTO CONFIG (PAGE_ID, NAME, DATA, HASH) VALUES (?, ?, ?, ?)', [
                respond.PAGE_ID, respond.NAME, respond.content.DATA, respond.content.HASH
              ]);

              // run callback function on this data
              callback(respond.content.DATA);
            }

          } // eof for loop
        } // eof callback
      ); // eof sharedWebSocket.subscribe

    };

    var _fireCallbacksForCachedData = function (callbacksQueue, cachedDataQueue) {

      for (var index = 0, length = cachedDataQueue.length; index < length; index++) {

        var cachedData = cachedDataQueue[index];
        if (cachedData !== null) {
          callbacksQueue[index].forEach(function(callback) {
            callback(cachedData);
          });
        }
      }

    };

    var _indexOfProperty = function(needle, propertyName, haystack) {
      var index, length;
      for (index = 0, length = haystack.length; index < length; index++) {
        if (deepEquals.compare(haystack[index][propertyName], needle)) {
          return index;
        }
      }
      return -1;
    };

    var _runItem = function(query, callback) {

      var portletId = query.portletId;
      var configName = query.configName;

      // проверить наличие данных в alasql

      var select = alasql.compile('SELECT * FROM CONFIG WHERE PAGE_ID = ? AND  NAME = ?');
      select([portletId, configName], function(queryResult) {
        console.log('>> SELECT * FROM CONFIG WHERE PAGE_ID = ' +portletId+ ' AND  NAME = ' + configName);

        var cachedData = null;

        if (queryResult.length === 1) {
          // Add hash value to the query
          query.hash = queryResult[0].HASH;
          // Get cached data
          cachedData = queryResult[0].DATA;
        }

        callback({
          query: query,
          cachedData: cachedData
        });
      });

    };

    this.subscribeToConfig = function(query, callback) {

      // // Check input parameters
      // if (typeof(portletId) !== 'string') {
      //   throw Error("Invalid argument: portletId must be a string");
      // }
      // if (typeof(configName) !== 'string') {
      //   throw Error("Invalid argument: configName must be a string");
      // }

      // find this query
      var index = _indexOfProperty(query, 'query', queue);

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

      if (doWaitForRunCall === false) {
        this.run();
      }

    };

  });
