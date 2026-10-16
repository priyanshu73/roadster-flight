export type Action =
  | 'forward'
  | 'backward'
  | 'left'
  | 'right'
  | 'boost'
  | 'hop'
  | 'reset'
  | 'camera'
  | 'pause'
  | 'debug'
  | 'talk'
  | 'horn'
  | 'mute';

const bindings: Record<string, Action> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'boost',
  ShiftLeft: 'hop',
  ShiftRight: 'hop',
  KeyR: 'reset',
  KeyC: 'camera',
  KeyE: 'talk',
  KeyH: 'horn',
  KeyM: 'mute',
  Escape: 'pause',
  Backquote: 'debug',
};

export interface Actions {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  boost: boolean;
  hop: boolean;
  reset: boolean;
  camera: boolean;
  talk?: boolean;
  horn?: boolean;
  mute?: boolean;
}

export const idleActions = (): Actions => ({
  forward: false,
  backward: false,
  left: false,
  right: false,
  boost: false,
  hop: false,
  reset: false,
  camera: false,
});

/** Physical keys are tracked separately so releasing W does not release held Up. */
export class InputBuffer {
  private keys = new Set<string>();
  private edges = new Map<Action, number>();

  down(code: string, repeat = false): boolean {
    const action = bindings[code];
    if (!action) return false;
    if (!repeat && !this.keys.has(code) && !this.held(action))
      this.edges.set(action, (this.edges.get(action) ?? 0) + 1);
    this.keys.add(code);
    return true;
  }

  up(code: string): void {
    this.keys.delete(code);
  }
  held(action: Action): boolean {
    return [...this.keys].some((code) => bindings[code] === action);
  }
  consume(action: Action): boolean {
    const count = this.edges.get(action) ?? 0;
    if (count > 1) this.edges.set(action, count - 1);
    else this.edges.delete(action);
    return count > 0;
  }
  clear(): void {
    this.keys.clear();
    this.edges.clear();
  }
  tick(): Actions {
    return {
      forward: this.held('forward'),
      backward: this.held('backward'),
      left: this.held('left'),
      right: this.held('right'),
      boost: this.held('boost'),
      hop: this.consume('hop'),
      reset: this.consume('reset'),
      camera: this.consume('camera'),
      talk: this.consume('talk'),
      horn: this.consume('horn'),
      mute: this.consume('mute'),
    };
  }
}
