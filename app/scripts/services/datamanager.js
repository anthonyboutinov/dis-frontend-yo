'use strict';

/**
 * @ngdoc service
 * @name dis1App.configManager
 * @description
 * # configManager
 * Service in the dis1App.
 */

(function() {

  var presets = function() {

    var _presets = {
      config: {
        tableName: 'CONFIG'
      },
      data: {
        tableName: 'DATA'
      }
    };

    _presets.config = {

        tableName: 'CONFIG',

        create: function() {
          var sql = 'CREATE TABLE IF NOT EXISTS ' + _presets.config.tableName;// + ' ( \
          //  ID_' + _presets.config.tableName + ' INT AUTO_INCREMENT, \
          //  PORTLET_ID STRING NOT NULL, \
          //  NAME STRING NOT NULL, \
          //  DATA JSON NOT NULL, \
          //  HASH STRING NOT NULL, \
          //  PRIMARY KEY (ID_' + _presets.config.tableName + '), \
          //  UNIQUE(PORTLET_ID, NAME) \
          //  )';
          return sql;
        }(),

        processWileCached: function(respond, cachedData, callback) {
          // if not already up to date
          if (respond.content !== 'alreadyUpToDate') {

            // update cache with new value
            alasql('UPDATE ? SET DATA = ?, HASH = ? WHERE PORTLET_ID = ? AND NAME = ?', [
              _presets.config.tableName, respond.content.DATA, respond.content.HASH, respond.PORTLET_ID, respond.NAME
            ]);

            // and run callback function on this fresh data
            callback(respond.content.DATA);

          }
          // if cached data IS up to date
          else {
            // run callback function on cached data
            callback(cachedData);
          }
        },

        processWhileNotCached: function(respond, cachedData, callback) {
          // write to cache
          alasql('INSERT INTO ? (PORTLET_ID, NAME, DATA, HASH) VALUES (?, ?, ?, ?)', [
            _presets.config.tableName, respond.PORTLET_ID, respond.NAME, respond.content.DATA, respond.content.HASH
          ]);

          // run callback function on this data
          callback(respond.content.DATA);
        },

        runItem: function(query, callback, index) {

          // проверить наличие данных в alasql
          var select = alasql.compile('SELECT * FROM ? WHERE PORTLET_ID = ? AND  NAME = ?');
          select([_presets.config.tableName, query.portletId, query.configName], function(queryResult) {

            console.log('SELECT * FROM ' + _presets.config.tableName + ' WHERE PORTLET_ID = ' + query.portletId + ' AND  NAME = ' + query.configName + ':');

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

          return index;

        } // eof runItem


      }; // eof config


      /*********************************/
      /*         presets.data          */
      /*********************************/
      _presets.data = {

        tableName: 'DATA',

        create: function() {
          var sql =
           'CREATE TABLE IF NOT EXISTS ' + _presets.data.tableName;// + ' ( \
            // ID_' + _presets.data.tableName + ' INT AUTO_INCREMENT, \
            // PORTLET_ID STRING NOT NULL, \
            // WEBPART_ID STRING NOT NULL, \
            // DATA JSON NOT NULL, \
            // PRIMARY KEY (ID_' + _presets.data.tableName + ') \
            // )';
          return sql;
        }(),

        processWileCached: function(respond, cachedData, callback) {

          // update cache with new value
          // alasql('UPDATE ? SET DATA = ?, HASH = ? WHERE PORTLET_ID = ? AND NAME = ?', [
          //   this.data.tableName, respond.content.DATA, respond.content.HASH, respond.PORTLET_ID, respond.NAME
          // ]);

          // and run callback function on this fresh data
          callback(respond.content.DATA);

        },

        processWhileNotCached: function(respond, cachedData, callback) {
          // write to cache
          // alasql('INSERT INTO ? (PORTLET_ID, NAME, DATA, HASH) VALUES (?, ?, ?, ?)', [
          //   this.data.tableName, respond.PORTLET_ID, respond.NAME, respond.content.DATA, respond.content.HASH
          // ]);

          // run callback function on this data
          callback(respond.content.DATA);
        },

        runItem: function(query, callback, index) {

          // проверить наличие данных в alasql
          // var select = alasql.compile('SELECT * FROM ? WHERE PORTLET_ID = ? AND  NAME = ?');
          // select([this.config.tableName, query.portletId, query.configName], function(queryResult) {
          //
          //   console.log('SELECT * FROM ' + this.config.tableName + ' WHERE PORTLET_ID = ' + query.portletId + ' AND  NAME = ' + query.configName + ':');
          //
          //   var cachedData = null;
          //
          //   if (queryResult.length === 1) {
          //     // Add hash value to the query
          //     query.hash = queryResult[0].HASH;
          //     // Get cached data
          //     cachedData = queryResult[0].DATA;
          //   }

            callback({
              query: query,
              cachedData: null
            });

            return index;
          // });

        } // eof runItem


      };

    return _presets;

  }();

  console.log(presets);

  var BaseDataStorage = (function (_dataKind, sharedWebSocket, deepEquals) {

    var _tableName = presets[_dataKind].tableName;

    var doWaitForRunCall = true;

    var queue = []; // an array of {query, [callback]}

    return {

      drop: function() {
        alasql('DROP TABLE ?', [_tableName]);
      },

      createTable: function() {
        alasql(createConfigTableStatement);
      },

      run: function() {
        console.log(_dataKind + "Manager run event fired");
        doWaitForRunCall = false;

        // var runItem = ;

        var websocketQueue = []; // an array of query values
        var callbacksQueue = [];
        var cachedDataQueue = []; // an array of cachedData

        var index, length;
        for (index = 0, length = queue.length; index < length; index++) {
          var item = queue[index];

          // create scope so that the correct `index` value is used in callback funciton
          // (function(index, runItem, subscribe) {

          var that = this;
          presets[_dataKind].runItem(item.query, function(result) {
            console.log(" _runItem callback fired with result:");
            console.log(result);
            websocketQueue.push(result.query);
            callbacksQueue.push(item.callback);
            cachedDataQueue.push(result.cachedData);

            // when all are processed, proceed to `subscribe`
            if (index === length - 1) {
              that._subscribe(websocketQueue, callbacksQueue, cachedDataQueue);
            }
          });

          // })(index, presets[_dataKind].runItem, this._subscribe);
          // eof scope

          // reset queue
          queue = [];

        }

      },

      _subscribe: function(websocketQueue, callbacksQueue, cachedDataQueue) {

        console.log("subscribe fired with websocketQueue:");
        console.log(websocketQueue);

        if (this._isConnectionEstablished()) {
          this._subscribeWithWebSocket(websocketQueue, callbacksQueue, cachedDataQueue);
        } else {
          this._fireCallbacksForCachedData(callbacksQueue, cachedDataQueue);
        }

      },

      _isConnectionEstablished: function() {
        var state = sharedWebSocket.readyState();
        if (state === 3 /* NO CONNECTION */) {
          return false;
        }
        return true;
      },

      _subscribeWithWebSocket: function(websocketQueue, callbacksQueue, cachedDataQueue) {

        sharedWebSocket.subscribe(
          {
            dataKind: _dataKind,
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
              if (typeof(cachedData) !== "undefined" && cachedData !== null) {
                _processWhileCached(respond, cachedData, callback);
              } else {
                _processWhileNotCached(respond, cachedData, callback);
              }

            } // eof for loop
          } // eof callback
        ); // eof sharedWebSocket.subscribe

      },

      _fireCallbacksForCachedData: function (callbacksQueue, cachedDataQueue) {

        for (var index = 0, length = cachedDataQueue.length; index < length; index++) {

          var cachedData = cachedDataQueue[index];
          if (typeof(cachedData) !== "undefined" && cachedData !== null) {
            callbacksQueue[index].forEach(function(callback) {
              callback(cachedData);
            });
          }
        }

      },

      _indexOfProperty: function(needle, propertyName, haystack) {
        var index, length;
        for (index = 0, length = haystack.length; index < length; index++) {
          if (deepEquals.compare(haystack[index][propertyName], needle)) {
            return index;
          }
        }
        return -1;
      },

      subscribe: function(query, callback) {

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

        if (this.doWaitForRunCall === false) {
          this.run();
        }

      }

    };

    return _presets;

  });

  angular.module('dis1App')

    .config(function() {
      alasql.options.angularjs = true;
      alasql.options.errorlog = true; // Log or throw error
      // alasql.options.casesensitive = true; // Table and column names are case sensitive and converted to lower-case
      // alasql.options.logprompt = true; // Print SQL at log
      // alasql.options.columnlookup = 10; // How many rows to lookup to define columns
    })

    .run(function(configManager, dataManager) {

      alasql('CREATE INDEXEDDB DATABASE IF NOT EXISTS APP; \
              ATTACH INDEXEDDB DATABASE APP;', [], function() {
              console.log(new Date() + ' alasql: database APP has been attached');

                alasql('USE APP;\
                  CREATE TABLE IF NOT EXISTS CONFIG ( \
                  ID_CONFIG INT AUTO_INCREMENT, \
                  PORTLET_ID STRING NOT NULL, \
                  NAME STRING NOT NULL, \
                  DATA JSON NOT NULL, \
                  HASH STRING NOT NULL, \
                  PRIMARY KEY (ID_CONFIG), \
                  UNIQUE(PORTLET_ID, NAME) \
                );');
                alasql('\
                  CREATE TABLE IF NOT EXISTS DATA ( \
                  ID_DATA INT AUTO_INCREMENT, \
                  PORTLET_ID STRING NOT NULL, \
                  WEBPART_ID STRING NOT NULL, \
                  DATA JSON NOT NULL, \
                  PRIMARY KEY (ID_CONFIG) \
                );');
                console.log(new Date() + ' alasql: database APP has been selected, table CONFIG_DATA has been created');
                configManager.run();
                dataManager.run();

    });
    console.log(new Date() + ' alasql: init request sent');

    })

    .factory('configManager', function(sharedWebSocket, deepEquals) {

      var configManager = Object.create(BaseDataStorage('config', sharedWebSocket, deepEquals));

      // methods and properties that are unique to this subclass
      configManager.populate = function() {

        // var tableName = presets.config.tableName;
        alasql('INSERT INTO CONFIG (PORTLET_ID, NAME, DATA, HASH) VALUES (?, ?, ?, ?)', [
          '222', 'test', {width: '100%', height: '400px'}, 'hashValueComputedOnServer'
        ]);
        alasql('INSERT INTO CONFIG (PORTLET_ID, NAME, DATA, HASH) VALUES (?, ?, ?, ?)', [
          'main', 'styling', {
            h1: {
              color: '#66afe9'
            }
          }, 'hashValueComputedOnServer'
        ]);

      };

      return configManager;

    }).factory('dataManager', function(sharedWebSocket, deepEquals) {

      var configManager = Object.create(BaseDataStorage('data', sharedWebSocket, deepEquals));

      // methods and properties that are unique to this subclass
      // ...

      return configManager;
    });


})();
