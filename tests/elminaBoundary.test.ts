import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isPointInsideElmina, validateElminaCoordinates } from '../src/lib/utils/elminaBoundary.ts';

describe('Elmina Geographic Boundary Validation', () => {
  it('accepts coordinates inside Elmina Central Park', () => {
    const lat = 3.1802;
    const lng = 101.5188;
    assert.strictEqual(isPointInsideElmina(lat, lng), true);

    const validation = validateElminaCoordinates(lat, lng);
    assert.strictEqual(validation.isValid, true);
    assert.strictEqual(typeof validation.nearestPrecinct, 'string');
  });

  it('accepts coordinates inside Elmina Green 3', () => {
    const lat = 3.1818;
    const lng = 101.5125;
    assert.strictEqual(isPointInsideElmina(lat, lng), true);

    const validation = validateElminaCoordinates(lat, lng);
    assert.strictEqual(validation.isValid, true);
  });

  it('accepts coordinates inside Denai Alam', () => {
    const lat = 3.1741;
    const lng = 101.5218;
    assert.strictEqual(isPointInsideElmina(lat, lng), true);

    const validation = validateElminaCoordinates(lat, lng);
    assert.strictEqual(validation.isValid, true);
  });

  it('rejects coordinates far outside Elmina (e.g. KLCC / Kuala Lumpur City Centre)', () => {
    const lat = 3.1578;
    const lng = 101.7120; // KLCC
    assert.strictEqual(isPointInsideElmina(lat, lng), false);

    const validation = validateElminaCoordinates(lat, lng);
    assert.strictEqual(validation.isValid, false);
    assert.match(validation.message || '', /outside the Elmina township boundary/);
  });

  it('rejects coordinates in Petaling Jaya / Damansara', () => {
    const lat = 3.1390;
    const lng = 101.6160;
    assert.strictEqual(isPointInsideElmina(lat, lng), false);
  });
});
