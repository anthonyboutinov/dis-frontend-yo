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


    dataStream.onMessage(function(message) {
      console.log(message);
      // this.collection.push(JSON.parse(message.data));
    });
    //
    // this.getData = function() {
    //   dataStream.send(JSON.stringify({ action: 'get' }));
    // };

    this.subscribe = function(to, callback) {

      // if NOT already subscribed
      if (subscribedTo.indexOf(to) === -1) {

        // note to self
        subscribedTo.push(to);

        // send subscribe request
        dataStream.send(JSON.stringify({
          action: 'subscribe',
          to: to
        }));
      }

      dataStream.onMessage(function(message) {
        var data = JSON.parse(message.data);
        console.log(data);
        if (data.to === to) {
          callback(data.content);
        }
      });
    };

    this.unsubscribe = function(from) {

      var index = subscribedTo.indexOf(from);
      if (index > -1) {

        // removed from `subscribedTo` list
        subscribedTo.splice(index, 1);

        // send unsubscribe request
        dataStream.send(JSON.stringify({
          action: 'unsubscribe',
          from: from
        }));
      }

    };

  });
