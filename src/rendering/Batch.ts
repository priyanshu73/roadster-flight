import * as T from 'three';
/** Preserve logical visibility while rendering shared geometry/material instances. */
export class SceneBatch {
  private groups: { mesh: T.InstancedMesh; sources: T.Mesh[] }[] = [];
  constructor(readonly root: T.Group) {
    root.updateMatrixWorld(true);
    const batches = new Map<string, T.Mesh[]>();
    root.traverse((o) => {
      if (o instanceof T.Mesh && !Array.isArray(o.material) && !o.userData.noBatch) {
        const key = `${o.geometry.uuid}:${o.material.uuid}`;
        const list = batches.get(key) || [];
        list.push(o);
        batches.set(key, list);
      }
    });
    for (const sources of batches.values()) {
      const mesh = new T.InstancedMesh(sources[0].geometry, sources[0].material, sources.length);
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      sources.forEach((o) => o.layers.set(1));
      root.add(mesh);
      this.groups.push({ mesh, sources });
    }
    this.update();
  }
  update(): void {
    this.root.updateMatrixWorld(true);
    const inverse = this.root.matrixWorld.clone().invert(),
      matrix = new T.Matrix4(),
      hidden = new T.Matrix4().makeScale(0, 0, 0);
    for (const { mesh, sources } of this.groups) {
      sources.forEach((o, i) => {
        let visible = true;
        for (let p: T.Object3D | null = o; p && p !== this.root; p = p.parent)
          if (!p.visible) {
            visible = false;
            break;
          }
        mesh.setMatrixAt(i, visible ? matrix.multiplyMatrices(inverse, o.matrixWorld) : hidden);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
}
