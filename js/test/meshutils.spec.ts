import {assert, expect, should} from 'chai';

import {
    compute_bounding_box,
    compute_bounding_sphere,
    compute_tetrahedron_cell_orientations,
    reorient_tetrahedron_cells,
    copy_reoriented
  } from '../src/meshutils';

import { expectAllCloseTo } from './utils.spec';


describe('meshutils', function() {
  describe('compute_bounding_box()', function() {
    const bounds = compute_bounding_box(new Float32Array([0.0, -1.0, +1.0, 2.0, -4.0, 6.0]));

    it('should return correct types', function() {
      expect(bounds.min).to.be.an("Array");
      expect(bounds.max).to.be.an("Array");
      expect(bounds.center).to.be.an("Array");
    });

    it('should return correct min and max values', function() {
      expectAllCloseTo(bounds.min, [0.0, -4.0, 1.0]);
      expectAllCloseTo(bounds.max, [2.0, -1.0, 6.0]);
      expectAllCloseTo(bounds.center, [1.0, -2.5, 3.5]);
    });
  });

  describe('compute_bounding_sphere()', function() {
    const bounds = compute_bounding_sphere(new Float32Array([0.0, -1.0, +1.0, 2.0, -4.0, 6.0]));

    it('should return correct types', function() {
      expect(bounds.center).to.be.an("Array");
      expect(bounds.radius).to.be.a("number");
    });

    it('should return correct center and radius', function() {
      expectAllCloseTo(bounds.center, [1.0, -2.5, 3.5]);
      expect(bounds.radius).to.be.closeTo(Math.sqrt(1*1 + 1.5*1.5 + 2.5*2.5), 1e-8);
    });
  });

  describe('reorient_tetrahedron_cells()', function() {
    const points = new Float32Array([
      0,0,0,  0,0,1,  0,1,0,  1,0,0,  -1,0,0,
    ]);

    const orig_cells = new Int32Array([
      0,1,2,3,  0,1,2,4,
    ]);
    const orig_cells_reoriented = new Int32Array([
      0,1,3,2,  0,1,4,2,
    ]);

    const cells0 = new Int32Array(orig_cells);
    const cells1 = new Int32Array(orig_cells);
    copy_reoriented(cells0, orig_cells, [0, 0]);
    copy_reoriented(cells1, orig_cells, [1, 1]);

    it('should have no effect to reorient with all flagged as 0', function() {
      expect(cells0).deep.eq(orig_cells);
    });
    it('should reorient all', function() {
      expect(cells1).deep.eq(orig_cells_reoriented);
    });

    const reorient = compute_tetrahedron_cell_orientations(orig_cells, points);
    const reorient_inv = compute_tetrahedron_cell_orientations(orig_cells_reoriented, points);

    it('should compute opposite orientations', function() {
      expect(reorient[0]).eq(1 - reorient_inv[0]);
      expect(reorient[1]).eq(1 - reorient_inv[1]);
    });
    it('should compute the correct orientation for original cells', function() {
      expect(reorient[0]).eq(1);
      expect(reorient[1]).eq(0);
    });
    it('should compute the correct orientation for reoriented cells', function() {
      expect(reorient_inv[0]).eq(0);
      expect(reorient_inv[1]).eq(1);
    });

    const cells2 = new Int32Array(orig_cells);
    reorient_tetrahedron_cells(cells2, reorient);
    const reorient2 = compute_tetrahedron_cell_orientations(cells2, points);

    it('should change all cells to have positive jacobian determinant', function() {
      expect(cells2).deep.eq(new Int32Array([0,1,3,2,0,1,2,4]));
    });
    it('should not require reorientation again', function() {
      expect(reorient2).deep.eq(new Uint8Array([0, 0]));
    });
  });
});
