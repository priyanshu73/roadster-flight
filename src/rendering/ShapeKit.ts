import * as T from 'three';
export class ShapeKit {
  readonly cube = new T.BoxGeometry(1, 1, 1);
  readonly sphere = new T.SphereGeometry(1, 10, 7);
  readonly cylinder = new T.CylinderGeometry(0.5, 0.5, 1, 10);
  readonly cone = new T.ConeGeometry(0.4, 1, 8);
  private materials = new Map<number, T.MeshStandardMaterial>();
  material(color: number): T.MeshStandardMaterial {
    let m = this.materials.get(color);
    if (!m) {
      m = new T.MeshStandardMaterial({ color, roughness: 0.75 });
      this.materials.set(color, m);
    }
    return m;
  }
  box(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
  ): T.Mesh {
    const m = new T.Mesh(this.cube, this.material(color));
    m.position.set(x, y, z);
    m.scale.set(w, h, d);
    parent.add(m);
    return m;
  }
  ball(parent: T.Object3D, x: number, y: number, z: number, r: number, color: number): T.Mesh {
    const m = new T.Mesh(this.sphere, this.material(color));
    m.position.set(x, y, z);
    m.scale.setScalar(r);
    parent.add(m);
    return m;
  }
  cable(parent: T.Object3D, a: T.Vector3, b: T.Vector3, r = 0.07): void {
    const dir = b.clone().sub(a),
      m = new T.Mesh(this.cylinder, this.material(0x61777e));
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.scale.set(r * 2, dir.length(), r * 2);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
    parent.add(m);
  }
  sign(text: string, width = 13): T.Mesh {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 80;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#254e4a';
    ctx.fillRect(0, 0, 512, 80);
    ctx.fillStyle = '#ffe5b5';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 256, 53, 500);
    const map = new T.CanvasTexture(c);
    map.colorSpace = T.SRGBColorSpace;
    return new T.Mesh(
      new T.PlaneGeometry(width, 2),
      new T.MeshBasicMaterial({ map, side: T.DoubleSide }),
    );
  }
  person(color: number, mask = false) {
    const group = new T.Group(),
      arms: T.Mesh[] = [],
      legs: T.Mesh[] = [];
    this.box(group, 0, 1, 0, 0.48, 0.68, 0.28, color);
    this.ball(group, 0, 1.56, 0, 0.22, mask ? 0xe9a84b : 0xc8916b);
    for (const side of [-1, 1]) {
      legs.push(this.box(group, side * 0.14, 0.4, 0, 0.18, 0.75, 0.2, 0x2c4151));
      arms.push(this.box(group, side * 0.34, 1.02, 0, 0.15, 0.65, 0.17, color));
      if (mask) this.box(group, side * 0.09, 1.59, 0.2, 0.1, 0.06, 0.03, 0xa9eeeb);
    }
    return { group, arms, legs };
  }
  car(color: number, police = false, suv = false) {
    const group = new T.Group();
    this.box(group, 0, 0, 0, 2.1, suv ? 1.3 : 0.8, 4.2, color);
    this.box(group, 0, 0.6, -0.15, 1.7, 0.65, 2.1, 0x304b5e);
    for (const x of [-1.05, 1.05])
      for (const z of [-1.3, 1.3]) {
        const w = new T.Mesh(this.cylinder, this.material(0x141c21));
        w.scale.set(0.8, 0.25, 0.8);
        w.rotation.z = Math.PI / 2;
        w.position.set(x, -0.3, z);
        group.add(w);
      }
    this.box(group, 0, 0.1, 2.13, 1.6, 0.12, 0.05, 0xe8eacb);
    this.box(group, 0, 0.1, -2.13, 1.6, 0.12, 0.05, 0xde4b40);
    if (color === 0xe5b84b) this.box(group, 0, 1, 0, 0.75, 0.25, 0.6, color);
    const red = this.box(group, -0.3, 1, 0, 0.6, 0.2, 0.5, 0xff302a),
      blue = this.box(group, 0.3, 1, 0, 0.6, 0.2, 0.5, 0x326aff);
    red.visible = blue.visible = police;
    return { group, red, blue };
  }
}
