/**
 * Integration test for Gopher UI
 * Tests that the UI can be instantiated and has the expected methods
 * 
 * Requirements: 13.5, 13.6
 */

import { describe, test, expect } from 'vitest';
import { GopherUI } from '../../generated/gopher/gopher-ui.js';

describe('Gopher UI Integration', () => {
  test('should instantiate GopherUI class', () => {
    const ui = new GopherUI();
    expect(ui).toBeDefined();
    expect(ui).toBeInstanceOf(GopherUI);
  });

  test('should have start method', () => {
    const ui = new GopherUI();
    expect(ui.start).toBeDefined();
    expect(typeof ui.start).toBe('function');
  });

  test('should export GopherUI class', () => {
    expect(GopherUI).toBeDefined();
    expect(typeof GopherUI).toBe('function');
  });
});
