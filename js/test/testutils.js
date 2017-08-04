"use strict";

import {assert, expect, should} from 'chai';

const expectAllCloseTo = (actual, expected, delta=1e-8) => {
  for (let i in actual) {
    expect(actual[i]).closeTo(expected[i], delta);
  }
};

export { expectAllCloseTo };
