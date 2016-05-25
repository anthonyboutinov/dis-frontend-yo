'use strict';

/**
 * @ngdoc function
 * @name dis1App.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the dis1App
 */
angular.module('dis1App')
  .controller('MainCtrl', function ($scope, configManager) {

    $scope.name = "Prototype";



    $scope.config = null;

    configManager.subscribeToConfig({portletId: 'main', configName: 'styling'}, function(config) {
      $scope.$apply(function(){
        $scope.config = config;
      });
    });

    configManager.subscribeToConfig({portletId: 'test', configName: 'test'}, function(config) {
      $scope.$apply(function(){
        $scope.test = config;
      });
    });

  });
