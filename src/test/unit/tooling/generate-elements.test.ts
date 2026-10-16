import { generateElements } from '../../fixtures/generate-elements';

describe('generateElements', () => {
  it('rejects a negative or non-integer count', () => {
    expect(() => generateElements({ count: -1 })).toThrow();
    expect(() => generateElements({ count: 1.5 })).toThrow();
  });

  it('returns an empty board for count 0', () => {
    expect(generateElements({ count: 0 })).toEqual([]);
  });

  it('generates exactly the requested number of elements with unique ids', () => {
    const elements = generateElements({ count: 250 });
    const ids = elements.map((element) => element.id.value);

    expect(elements).toHaveLength(250);
    expect(new Set(ids).size).toBe(250);
  });

  it('is deterministic for a given seed', () => {
    const first = generateElements({ count: 40, seed: 7 });
    const second = generateElements({ count: 40, seed: 7 });

    expect(first.map((element) => element.position.toJSON())).toEqual(
      second.map((element) => element.position.toJSON()),
    );
  });

  it('produces different layouts for different seeds', () => {
    const first = generateElements({ count: 40, seed: 1 });
    const second = generateElements({ count: 40, seed: 2 });

    expect(first.map((element) => element.position.toJSON())).not.toEqual(
      second.map((element) => element.position.toJSON()),
    );
  });

  it('mixes element types on a board large enough for connectors', () => {
    const types = new Set(generateElements({ count: 60 }).map((element) => element.type));

    expect(types).toEqual(new Set(['text', 'note', 'task', 'frame', 'connector', 'link']));
  });

  it('avoids connectors on boards too small to hold a valid pair', () => {
    const types = new Set(generateElements({ count: 2 }).map((element) => element.type));

    expect(types.has('connector')).toBe(false);
  });

  it('validates every generated element against the domain rules', () => {
    const elements = generateElements({ count: 120 });

    for (const element of elements) {
      expect(element.createdAt.getTime()).toBeLessThanOrEqual(element.updatedAt.getTime());
    }
  });
});
