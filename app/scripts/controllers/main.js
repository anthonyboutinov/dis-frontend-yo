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

    $scope.name = "Prototype";



    $scope.config = null;

    configDataStorage.subscribeToConfig({portletId: 'main', configName: 'styling'}, function(config) {
      $scope.$apply(function(){
        $scope.config = config;
      });
    });

  });
