'use strict';

describe('Service: webSocketController', function () {

  // load the service's module
  beforeEach(module('dis1App'));

  // instantiate service
  var webSocketController;
  beforeEach(inject(function (_webSocketController_) {
    webSocketController = _webSocketController_;
  }));

  it('should do something', function () {
    expect(!!webSocketController).toBe(true);
  });

});
