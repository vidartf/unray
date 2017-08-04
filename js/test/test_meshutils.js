import {assert, expect, should} from 'chai';

import {
    compute_bounding_box,
    compute_bounding_sphere,
    reorient_tetrahedron_cells
  } from '../src/meshutils';

import { expectAllCloseTo } from './testutils';


describe('meshutils', function() {
  describe('#compute_bounding_box()', function() {
    it('should return correct min and max values', function() {
      const bounds = compute_bounding_box(new Float32Array([0.0, -1.0, +1.0, 2.0, -4.0, 6.0]));

      expect(bounds.min).to.be.an("Array");
      expect(bounds.max).to.be.an("Array");
      expect(bounds.center).to.be.an("Array");

      expectAllCloseTo(bounds.min, [0.0, -4.0, 1.0]);
      expectAllCloseTo(bounds.max, [2.0, -1.0, 6.0]);
      expectAllCloseTo(bounds.center, [1.0, -2.5, 3.5]);
    });
  });
  describe('#compute_bounding_sphere()', function() {
    it('should return correct center and radius', function() {
      const bounds = compute_bounding_sphere(new Float32Array([0.0, -1.0, +1.0, 2.0, -4.0, 6.0]));

      expect(bounds.center).to.be.an("Array");
      expect(bounds.radius).to.be.a("number");

      expectAllCloseTo(bounds.center, [1.0, -2.5, 3.5]);
      expect(bounds.radius).to.be.closeTo(Math.sqrt(1*1 + 1.5*1.5 + 2.5*2.5), 1e-8);
    });
  });
  describe('#reorient_tetrahedron_cells()', function() {
    it('should be change all cells to have positive jacobian determinant', function() {
      const nc = 1;
      const nv = nc * 4;
      const cells = new Float32Array(4*nc);
      const points = new Float32Array(3*nv);
      for (let i = 0; i < 4*nc; ++i) {
        cells[i] = i;
      }
      for (let j = 0; j < 3*nv; j += 3) {
        points[j + 0] = Math.random();
        points[j + 1] = Math.random();
        points[j + 2] = Math.random();
      }
      reorient_tetrahedron_cells(cells, points);
      // TODO: Add expectations
    });
  });
});
