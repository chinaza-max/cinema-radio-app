import { compileScenes, minutesFor } from './scene-compiler';

const scene = (extra: object = {}) => ({ speaker: 'narrator', text: 'Hello there.', ...extra }) as any;

describe('scene compiler', () => {
  it('maps narrator to N and keeps explicit values', () => {
    const [s] = compileScenes([scene({ place: 'moor', time: 'dusk', props: ['manor'], fx: ['fog'], characters: ['a:100'], camera: 'out' })]);
    expect(s).toMatchObject({ s: 'N', p: 'moor', tm: 'dusk', pr: ['manor'], fx: ['fog'], c: ['a:100'], cam: 'out', fl: 0 });
  });

  it('inherits place, time, props, fx and characters from the previous scene', () => {
    const out = compileScenes([
      scene({ place: 'moor', time: 'dusk', props: ['manor'], fx: ['fog'], characters: ['a:100'] }),
      scene(),
    ]);
    expect(out[1]).toMatchObject({ p: 'moor', tm: 'dusk', pr: ['manor'], fx: ['fog'], c: ['a:100'] });
  });

  it('resets props, fx and flashback when the place changes, but not characters', () => {
    const out = compileScenes([
      scene({ place: 'moor', time: 'dusk', props: ['manor'], fx: ['fog'], characters: ['a:100'], flashback: true }),
      scene({ place: 'room' }),
    ]);
    expect(out[1]).toMatchObject({ p: 'room', pr: [], fx: [], fl: 0, c: ['a:100'] });
  });

  it('carries a walking character at the position they walked to, keeping the pose', () => {
    const out = compileScenes([
      scene({ place: 'moor', time: 'day', characters: ['a:60>180:point', 'b:300'] }),
      scene(),
    ]);
    expect(out[1].c).toEqual(['a:180:point', 'b:300']);
  });

  it('lets a scene clear things with an empty array', () => {
    const out = compileScenes([scene({ place: 'moor', time: 'day', props: ['manor'] }), scene({ props: [] })]);
    expect(out[1].pr).toEqual([]);
  });

  it('cycles the camera when none is given', () => {
    const out = compileScenes([scene({ place: 'moor', time: 'day' }), scene(), scene(), scene(), scene()]);
    expect(out.map((s) => s.cam)).toEqual(['in', 'l', 'out', 'r', 'in']);
  });

  it('estimates minutes at 150 words per minute, minimum 1', () => {
    expect(minutesFor([{ t: 'one two three' }])).toBe(1);
    expect(minutesFor([{ t: Array(450).fill('w').join(' ') }])).toBe(3);
  });
  it('chooses cinema shots from who is speaking when the camera is omitted', () => {
    const out = compileScenes(
      [
        { speaker: 'narrator', text: 'a', place: 'bridge', time: 'night' },
        { speaker: 'cap', text: 'b' },
        { speaker: 'narrator', text: 'c' },
        { speaker: 'cap', text: 'd', camera: 'high' },
      ],
      'cinema',
    );
    expect(out.map((s) => s.cam)).toEqual(['wide', 'close', 'high', 'high']);
  });
});
