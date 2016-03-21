'use strict';

/**
 * @ngdoc function
 * @name dis1App.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the dis1App
 */
angular.module('dis1App')
  .controller('MainCtrl', function ($scope, configDataStorage) {

    $scope.config = {};

    configDataStorage.getConfig({pageId: 'main', configName: 'styling'}, function(config) {
      $scope.config = config;
    });

  });
