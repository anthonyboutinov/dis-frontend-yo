'use strict';

/**
 * @ngdoc service
 * @name dis1App.configDataStorage
 * @description
 * # configDataStorage
 * Service in the dis1App.
 */
angular.module('dis1App')
  .service('configDataStorage', function () {
    this.getData = function(configName, params) {
      // если configName не строка
      if (typeof(configName) !== "string") {
        throw Error("Invalid argument: configName must be a string");
      }

      // если params заданы
      if (typeof(params) !== "undefined") {

      }

    };

    this.sql = function(query) {
      // если query не строка
      if (typeof(query) !== "string") {
        throw Error("Invalid argument: query must be a string")
      }

      // исполнить запрос
      alasql(query);

      // если присутствует UPDATE в query
      if (query.toLowerCase().indexOf('update') != -1) {
        // разделить строку query на список строк, изначально разделенных ';'
        var listOfStatements = query.split(';');
        // для каждого из этого списка
        for each (statement in listOfStatements) {
          // если в нем есть UPDATE
          if (statement.toLowerCase().indexOf('update') != -1) {
            // сохранить изменения в БД на сервере для данного update

          }
        }
      }
    };

  });
