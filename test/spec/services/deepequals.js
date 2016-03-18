'use strict';

describe('Service: deepEquals', function () {

  // load the service's module
  beforeEach(module('dis1App'));

  // instantiate service
  var deepEquals;
  beforeEach(inject(function (_deepEquals_) {
    deepEquals = _deepEquals_;
  }));

  it('should do something', function () {
    expect(!!deepEquals).toBe(true);
  });

});
