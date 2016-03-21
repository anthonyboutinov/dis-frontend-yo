'use strict';

/**
 * @ngdoc function
 * @name dis1App.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the dis1App
 */
angular.module('dis1App')
  .controller('MainCtrl', function ($scope, dataManager, configManager) {

    $scope.name = "Prototype";



    $scope.config = {};

    configManager.subscribe({portletId: 'main', configName: 'styling'}, function(config) {
      $scope.$apply(function(){
        $scope.config = config;
      });
    });



    $scope.data = {
      some: [42, 43, 57, 73, 14, 13, 64, 62]
    };

    dataManager.subscribe({
      portletId: 'main',
      webPartId: 'main',
      params: {
        param1: 'value1',
        param2: 'value2'
      }
    }, function(newData) {

      $scope.$apply(function(){
        if (typeof($scope.data.some) === "undefined") {
          $scope.data.some = [];
        }
        $scope.data.some.push(newData);
      });

    });

  });
