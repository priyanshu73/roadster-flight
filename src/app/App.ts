import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FixedClock } from '../core/Clock';
import { InputBuffer } from '../core/Input';
import { loadCity } from '../world/City';
import { GameSession } from './GameSession';

const element = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id)! as T;
type State = 'loading' | 'menu' | 'playing' | 'paused' | 'error';
type Settings = { quality: 'low' | 'medium' | 'high'; reducedMotion: boolean };

export class App {
  private renderer: THREE.WebGLRenderer | null = null;
  private environment: THREE.WebGLRenderTarget | null = null;
  private session: GameSession | null = null;
  private physicsReady: Promise<void> | null = null;
  private clock = new FixedClock();
  private input = new InputBuffer();
  private state: State = 'loading';
  private settings: Settings = {
    quality: 'medium',
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
  private abort = new AbortController();
  private previousFrame = 0;
  private lastHud = 0;
  private frameMs = 0;
  private lifetime = new AbortController();

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem('roadster.settings.v1') || 'null');
      if (saved && ['low', 'medium', 'high'].includes(saved.quality))
        this.settings.quality = saved.quality;
      if (typeof saved?.reducedMotion === 'boolean')
        this.settings.reducedMotion = saved.reducedMotion;
    } catch {
      /* Settings are optional when storage is blocked. */
    }
    this.bindUI();
    void this.boot();
  }

  private bindUI(): void {
    const options = { signal: this.lifetime.signal };
    element('start').addEventListener('click', () => this.start(), options);
    element('resume').addEventListener('click', () => this.resume(), options);
    element('reset').addEventListener(
      'click',
      () => {
        this.session?.vehicle.reset(true);
        this.session?.cameraRig.reset();
        this.resume();
      },
      options,
    );
    element('return-menu').addEventListener('click', () => this.returnMenu(), options);
    element('retry').addEventListener(
      'click',
      () => {
        if (!this.renderer) location.reload();
        else void this.boot();
      },
      options,
    );
    document
      .querySelector('[data-city="new-york"]')!
      .addEventListener('click', () => element('start').focus(), options);
    const quality = element<HTMLSelectElement>('quality');
    quality.value = this.settings.quality;
    quality.addEventListener(
      'change',
      () => {
        this.settings.quality = quality.value as Settings['quality'];
        this.applyQuality();
        this.saveSettings();
      },
      options,
    );
    const reduced = element<HTMLInputElement>('reduced-motion');
    reduced.checked = this.settings.reducedMotion;
    reduced.addEventListener(
      'change',
      () => {
        this.settings.reducedMotion = reduced.checked;
        this.saveSettings();
      },
      options,
    );
    window.addEventListener('resize', () => this.resize(), options);
    window.addEventListener('blur', () => this.pause(), options);
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) this.pause();
      },
      options,
    );
    window.addEventListener(
      'keydown',
      (event) => {
        if (event.code === 'Escape' && !event.repeat) {
          event.preventDefault();
          if (this.state === 'playing') this.pause();
          else if (this.state === 'paused') this.resume();
          return;
        }
        if (this.state !== 'playing') {
          if (event.code === 'Tab' && this.state === 'paused') this.trapPauseFocus(event);
          return;
        }
        if (this.input.down(event.code, event.repeat)) event.preventDefault();
        if (this.input.consume('debug') && this.session) this.session.debug = !this.session.debug;
      },
      options,
    );
    window.addEventListener('keyup', (event) => this.input.up(event.code), options);
    window.addEventListener(
      'pagehide',
      (event) => {
        if (event.persisted) this.pause();
        else this.dispose();
      },
      options,
    );
  }

  private async boot(): Promise<void> {
    this.state = 'loading';
    element('retry').hidden = true;
    element<HTMLButtonElement>('start').disabled = true;
    element('load-status').textContent = 'Initialising physics and city geometry…';
    try {
      if (!this.renderer) {
        const canvas = document.createElement('canvas');
        if (!canvas.getContext('webgl2'))
          throw new Error(
            'WebGL2 is unavailable. Try a desktop browser with hardware acceleration enabled.',
          );
        this.renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          powerPreference: 'high-performance',
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.92;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        element('viewport').appendChild(this.renderer.domElement);
        canvas.addEventListener(
          'webglcontextlost',
          (event) => {
            event.preventDefault();
            this.pause();
            this.state = 'error';
            element('pause').hidden = false;
            element('pause-title').textContent = 'GRAPHICS INTERRUPTED.';
            element('resume').textContent = 'Reload game';
            element('resume').onclick = () => location.reload();
          },
          { signal: this.lifetime.signal },
        );
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        const room = new RoomEnvironment();
        this.environment = pmrem.fromScene(room, 0.04);
        room.dispose();
        pmrem.dispose();
        this.renderer.setAnimationLoop((now) => this.frame(now));
      }
      const [, city] = await Promise.all([
        (this.physicsReady ??= RAPIER.init()),
        loadCity(this.abort.signal),
      ]);
      if (this.abort.signal.aborted) return;
      this.session?.dispose();
      this.session = null;
      this.session = new GameSession(city, this.environment!.texture);
      this.applyQuality();
      this.resize();
      this.state = 'menu';
      element('start').innerHTML = '<span>Drive New York</span><span aria-hidden="true">↗</span>';
      element<HTMLButtonElement>('start').disabled = false;
      element('load-status').textContent =
        'Ready. W / ↑ to drive, A/D or ←/→ to steer. Space boosts, Shift hops.';
      if (new URLSearchParams(location.search).has('debug') || import.meta.env.DEV) {
        Object.defineProperty(window, '__roadster', {
          configurable: true,
          value: {
            snapshot: () => ({
              state: this.state,
              ...this.session?.snapshot(),
              canvasCount: document.querySelectorAll('canvas').length,
              calls: this.renderer?.info.render.calls,
              triangles: this.renderer?.info.render.triangles,
              geometries: this.renderer?.info.memory.geometries,
              frameMs: this.frameMs,
              droppedSeconds: this.clock.droppedSeconds,
            }),
          },
        });
      }
    } catch (error) {
      this.state = 'error';
      element('load-status').textContent =
        error instanceof Error ? error.message : 'Could not prepare the city.';
      element('retry').hidden = false;
      console.error(error);
    }
  }

  private start(): void {
    if (this.state !== 'menu' || !this.session) return;
    this.session.vehicle.reset(true);
    this.session.vehicle.pressure.reset();
    this.session.elapsed = 0;
    this.session.distance = 0;
    this.session.cameraRig.reset();
    this.state = 'playing';
    this.clock.reset();
    this.input.clear();
    element('menu').hidden = true;
    element('hud').hidden = false;
    document.body.classList.add('driving');
    (document.activeElement as HTMLElement)?.blur();
  }

  private pause(): void {
    this.input.clear();
    this.clock.reset();
    if (this.state !== 'playing') return;
    this.state = 'paused';
    element('pause').hidden = false;
    element('resume').focus();
  }

  private resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.input.clear();
    this.clock.reset();
    element('pause').hidden = true;
    (document.activeElement as HTMLElement)?.blur();
  }

  private returnMenu(): void {
    if (!this.session) return;
    this.input.clear();
    this.clock.reset();
    this.session.vehicle.reset(true);
    this.session.cameraRig.reset();
    this.state = 'menu';
    element('pause').hidden = true;
    element('hud').hidden = true;
    element('menu').hidden = false;
    document.body.classList.remove('driving');
    element('start').focus();
  }

  private frame(now: number): void {
    const dt = this.previousFrame ? Math.min((now - this.previousFrame) / 1000, 0.1) : 1 / 60;
    this.previousFrame = now;
    this.frameMs += (dt * 1000 - this.frameMs) * 0.08;
    if (!this.session || !this.renderer || this.state === 'loading' || this.state === 'error')
      return;
    const alpha =
      this.state === 'playing'
        ? this.clock.advance(now, (step) => this.session!.tick(step, this.input.tick()))
        : 1;
    this.session.render(alpha, dt, this.state === 'menu', this.settings.reducedMotion);
    this.renderer.render(this.session.scene, this.session.camera);
    if (now - this.lastHud > 80) {
      this.updateHUD();
      this.lastHud = now;
    }
  }

  private updateHUD(): void {
    const s = this.session!,
      v = s.vehicle;
    element('speed').textContent = String(Math.round(v.speed * 3.6));
    element('speed-fill').style.width = `${Math.min(100, (v.speed / 70) * 100)}%`;
    element('pressure').textContent = String(Math.floor(v.pressure.value));
    element('pressure-fill').style.width = `${v.pressure.value}%`;
    element('pressure-state').textContent = v.boosting
      ? 'THRUST ACTIVE'
      : v.pressure.value < 22
        ? 'COAST TO RECHARGE'
        : 'READY TO LAUNCH';
    document.querySelector('.pressure-card')!.classList.toggle('active', v.boosting);
    element('drive-mode').textContent = v.grounded ? 'ON THE GROUND' : 'AIRBORNE';
    const telemetry = v.telemetry();
    element('steering-label').textContent = v.grounded ? 'STEERING' : 'AIR YAW';
    element('steering-angle').textContent =
      `${Math.round(((v.grounded ? telemetry.steering : telemetry.yawRate) * 180) / Math.PI)}${v.grounded ? '°' : '°/s'}`;
    for (const key of document.querySelectorAll<HTMLElement>('[data-action]')) {
      key.classList.toggle(
        'pressed',
        this.state === 'playing' &&
          this.input.held(key.dataset.action as 'left' | 'right' | 'forward' | 'backward'),
      );
    }
    element('drive-time').textContent =
      `${String(Math.floor(s.elapsed / 60)).padStart(2, '0')}:${String(Math.floor(s.elapsed % 60)).padStart(2, '0')}`;
    element('drive-distance').textContent = `${(s.distance / 1000).toFixed(2)} KM`;
    element('notice').hidden = !s.notice;
    element('notice').textContent = s.notice;
    element('debug-info').hidden = !s.debug;
    if (s.debug)
      element('debug-info').textContent =
        `${this.frameMs.toFixed(1)} ms / frame\n${this.renderer!.info.render.calls} draw calls\n${this.renderer!.info.render.triangles.toLocaleString()} triangles\n${s.world.colliders.len()} colliders\n${s.data.roads.length} roads · ${s.data.buildings.length} buildings\n60 Hz fixed physics · ${this.clock.droppedSeconds.toFixed(2)}s dropped\nheading ${((telemetry.heading * 180) / Math.PI).toFixed(1)}° · yaw ${telemetry.yawRate.toFixed(2)} rad/s\nslip ${telemetry.lateralSpeed.toFixed(2)} m/s · ${telemetry.wheelContacts.filter(Boolean).length}/4 contacts\nboost ${telemetry.boostForce} N · hop ${telemetry.hopImpulse.toFixed(0)} Ns`;
  }

  private applyQuality(): void {
    if (!this.renderer) return;
    const ratio = this.settings.quality === 'low' ? 1 : this.settings.quality === 'high' ? 2 : 1.5;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, ratio));
    this.renderer.shadowMap.enabled = this.settings.quality !== 'low';
    if (this.session)
      this.session.scene.traverse((object) => {
        if (object instanceof THREE.Mesh)
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material])
            material.needsUpdate = true;
      });
    this.resize();
  }

  private resize(): void {
    this.renderer?.setSize(innerWidth, innerHeight);
    if (this.session) {
      this.session.camera.aspect = innerWidth / innerHeight;
      this.session.camera.updateProjectionMatrix();
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('roadster.settings.v1', JSON.stringify(this.settings));
    } catch {
      /* Optional. */
    }
  }

  private trapPauseFocus(event: KeyboardEvent): void {
    const items = [...element('pause').querySelectorAll<HTMLElement>('button,select,input')];
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.shiftKey && index <= 0) {
      event.preventDefault();
      items.at(-1)?.focus();
    } else if (!event.shiftKey && index === items.length - 1) {
      event.preventDefault();
      items[0].focus();
    }
  }

  dispose(): void {
    this.abort.abort();
    this.lifetime.abort();
    this.input.clear();
    this.renderer?.setAnimationLoop(null);
    this.session?.dispose();
    this.environment?.dispose();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
  }
}
