'use strict';

/**
 * @ngdoc service
 * @name dis1App.webSocketController
 * @description
 * # webSocketController
 * Service in the dis1App.
 */
angular.module('dis1App')
  .service('sharedWebSocket', function ($websocket) {
    // AngularJS will instantiate a singleton by calling "new" on this function

    // Open a WebSocket connection
    var dataStream = $websocket('ws://localhost:8080/websocket-test/echo');

    // this.collection = [];

    var subscribedTo = [];
    var ids = [];

    var nextId = 0;

    var getNextId = function() {
      return nextId++;
    };


    dataStream.onMessage(function(message) {
      console.log(message);
      // this.collection.push(JSON.parse(message.data));
    });
    //
    // this.getData = function() {
    //   dataStream.send(JSON.stringify({ action: 'get' }));
    // };

    dataStream.onError(function(message) {
      console.log(message);
    });

    this.readyState = function() {
      var state = dataStream.readyState();
      console.log('dataStream.readyState = ' + state);
      return state;
    };

    this.subscribe = function(to, callback) {

      // if NOT already subscribed
      if (subscribedTo.indexOf(to) === -1) {

        // note to self
        subscribedTo.push(to);

        // send subscribe request
        dataStream.send(JSON.stringify({
          action: 'subscribe',
          to: to, // will be an array for bulk data request
          id: getNextId()
        }));
      }

      var id = ids[subscribedTo.indexOf(to)];

      dataStream.onMessage(function(message) {
        var data = JSON.parse(message);
        console.log(message);
        if (data.id === id) {
          callback(message.content);
        }
      });
    };

    this.unsubscribe = function(from) {

      var index = subscribedTo.indexOf(from);
      if (index > -1) {

        var id = ids[index];

        // removed from `subscribedTo` list
        subscribedTo.splice(index, 1);
        ids.splice(index, 1);

        // send unsubscribe request
        dataStream.send(JSON.stringify({
          action: 'unsubscribe',
          id: id
        }));
      }

    };

  });
