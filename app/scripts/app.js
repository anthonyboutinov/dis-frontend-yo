'use strict';

/**
 * @ngdoc overview
 * @name dis1App
 * @description
 * # dis1App
 *
 * Main module of the application.
 */
angular
  .module('dis1App', [
    'ngRoute',
    'ngWebSocket'
  ])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl',
        controllerAs: 'main'
      })
      .otherwise({
        redirectTo: '/'
      });
  });
