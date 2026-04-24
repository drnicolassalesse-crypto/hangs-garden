import { describe, expect, it } from 'vitest';
import { luxToLevel } from '../lightMap';

describe('luxToLevel', () => {
  it('maps 0–500 lux to low', () => {
    expect(luxToLevel(0)).toBe('low');
    expect(luxToLevel(100)).toBe('low');
    expect(luxToLevel(500)).toBe('low');
  });

  it('maps 501–2 500 lux to medium', () => {
    expect(luxToLevel(501)).toBe('medium');
    expect(luxToLevel(1500)).toBe('medium');
    expect(luxToLevel(2500)).toBe('medium');
  });

  it('maps 2 501–10 000 lux to bright_indirect', () => {
    expect(luxToLevel(2501)).toBe('bright_indirect');
    expect(luxToLevel(5000)).toBe('bright_indirect');
    expect(luxToLevel(10000)).toBe('bright_indirect');
  });

  it('maps 10 001+ lux to direct_sunlight', () => {
    expect(luxToLevel(10001)).toBe('direct_sunlight');
    expect(luxToLevel(50000)).toBe('direct_sunlight');
  });

  it('treats negative or NaN as low', () => {
    expect(luxToLevel(-10)).toBe('low');
    expect(luxToLevel(Number.NaN)).toBe('low');
  });
});
