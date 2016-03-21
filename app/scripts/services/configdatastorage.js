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
                  CREATE TABLE IF NOT EXISTS CONFIG_DATA ( \
                  ID_CONFIG_DATA INT AUTO_INCREMENT, \
                  PAGE_ID STRING NOT NULL, \
                  NAME STRING NOT NULL, \
                  DATA JSON NOT NULL, \
                  HASH STRING NOT NULL, \
                  PRIMARY KEY (ID_CONFIG_DATA), \
                  UNIQUE(PAGE_ID, NAME) \
                );');
                console.log(new Date() + ' alasql: database APP has been selected, table CONFIG_DATA has been created');
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
      alasql('DROP TABLE CONFIG_DATA;');
    };

    this.populate = function() {
      alasql('INSERT INTO CONFIG_DATA (PAGE_ID, NAME, DATA, HASH) VALUES (?, ?, ?, ?)', [
        '222', 'test', {width: '100%', height: '400px'}, 'JFSKL3rfs'
      ]);
      alasql('INSERT INTO CONFIG_DATA (PAGE_ID, NAME, DATA, HASH) VALUES (?, ?, ?, ?)', [
        'main', 'styling', {
          h1: {
            color: '#66afe9'
          }
        }, '000000'
      ]);
    };

    this.test = function() {
      this.getConfig({pageId: 'notCachedPage', configName: 'notCachedConfig'}, function(value){alert(value);});
      // this.getConfig({pageId: 'main', configName: 'jumbotron-h1'}, function(value){alert(value);});
      this.getConfig({pageId: '222', configName: 'test'}, function(value){alert(value);});
      this.run();
    };

    this.createTable = function() {
      var res = alasql('CREATE TABLE IF NOT EXISTS CONFIG_DATA ( \
        ID_CONFIG_DATA INT AUTO_INCREMENT, \
        PAGE_ID STRING NOT NULL, \
        NAME STRING NOT NULL, \
        DATA JSON NOT NULL, \
        HASH STRING NOT NULL, \
        PRIMARY KEY (ID_CONFIG_DATA), \
        UNIQUE(PAGE_ID, NAME) \
      );');
      if (res === 0) {
        console.log('alasql: table CONFIG_DATA is already present');
      } else {
        console.log('alasql: table CONFIG_DATA has been created');
      }
    };

    var queue = []; // an array of {query, [callback]}

    this.run = function() {
      console.log("configDataStorage run event fired");

      var websocketQueue = []; // an array of query values
      var cachedDataQueue = []; // an array of cachedData

      var index, length;
      for (index = 0, length = queue.length; index < length; index++) {
        var item = queue[index];

        // create scope so that the correct `index` value is used in callback funciton
        (function(index) {

          _runItem(item.query, function(result) {
            console.log(" _runItem callback fired with result:");
            console.log(result);
            websocketQueue.push(result.query);
            cachedDataQueue.push(result.cachedData);

            // when all are processed, proceed to `subscribe`
            if (index === length - 1) {
              _subscribe(websocketQueue, cachedDataQueue);
            }
          });

        })(index);
        // eof scope

      }

    };

    var _subscribe = function(websocketQueue, cachedDataQueue) {

      console.log(" subscribe fired with websocketQueue:");
      console.log(websocketQueue);

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

            // find and retrieve callback function for this item in `queue` array
            var indexInQueue = _indexOfProperty(respond.query, 'query', queue);
            var callback = queue[indexInQueue].callback;

            // find and retrieve `cachedData` value for this item in `cachedDataQueue` array
            var cachedData = cachedDataQueue[indexInQueue];


            // if data is present in cache
            if (cachedData === null) {

              // if not already up to date
              if (respond.content !== 'alreadyUpToDate') {

                // update cache with new value
                alasql('UPDATE CONFIG_DATA SET DATA = ?, HASH = ? WHERE PAGE_ID = ? AND NAME = ?', [
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
              alasql('INSERT INTO CONFIG_DATA (PAGE_ID, NAME, DATA, HASH) VALUES (?, ?, ?, ?)', [
                respond.PAGE_ID, respond.NAME, respond.content.DATA, respond.content.HASH
              ]);

              // run callback function on this data
              callback(respond.content.DATA);
            }
          }
        }
      );

    };

    var _checkState = function() {
      var state = sharedWebSocket.readyState();
      if (!state) {
        console.log('not ready');
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

      var pageId = query.pageId;
      var configName = query.configName;

      // проверить наличие данных в alasql

      var select = alasql.compile('SELECT * FROM CONFIG_DATA WHERE PAGE_ID = ? AND  NAME = ?');
      select([pageId, configName], function(queryResult) {
        console.log('>> SELECT * FROM CONFIG_DATA WHERE PAGE_ID = ' +pageId+ ' AND  NAME = ' + configName);

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

    this.getConfig = function(query, callback) {

      // // Check input parameters
      // if (typeof(pageId) !== 'string') {
      //   throw Error("Invalid argument: pageId must be a string");
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

    };

  });
