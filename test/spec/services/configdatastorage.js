'use strict';

describe('Service: configDataStorage', function () {

  // load the service's module
  beforeEach(module('dis1App'));

  // instantiate service
  var configDataStorage;
  beforeEach(inject(function (_configDataStorage_) {
    configDataStorage = _configDataStorage_;
  }));

  it('should do something', function () {
    expect(!!configDataStorage).toBe(true);
  });

});
