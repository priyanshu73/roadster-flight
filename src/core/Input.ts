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
  | 'debug';

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
  private edges = new Set<Action>();

  down(code: string, repeat = false): boolean {
    const action = bindings[code];
    if (!action) return false;
    if (!repeat && !this.keys.has(code) && !this.held(action)) this.edges.add(action);
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
    const pressed = this.edges.has(action);
    this.edges.delete(action);
    return pressed;
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
    };
  }
}
