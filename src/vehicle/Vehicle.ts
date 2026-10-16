import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import type { Actions } from '../core/Input';
import { Pressure } from './Pressure';
import { VEHICLE_TUNING as tuning } from './VehicleTuning';

export const WHEELS = [
  { x: -0.88, y: 0.05, z: 1.34 },
  { x: 0.88, y: 0.05, z: 1.34 },
  { x: -0.88, y: 0.05, z: -1.34 },
  { x: 0.88, y: 0.05, z: -1.34 },
];

export class Vehicle {
  readonly body: RAPIER.RigidBody;
  readonly controller: RAPIER.DynamicRayCastVehicleController;
  readonly pressure = new Pressure();
  readonly previousPosition = new Vector3();
  readonly currentPosition = new Vector3();
  readonly previousRotation = new Quaternion();
  readonly currentRotation = new Quaternion();
  private groundedTicks = 0;
  private hopCooldown = 0;
  private resetCooldown = 0;
  private steering = 0;
  private forward = new Vector3();
  private velocity = new Vector3();
  private up = new Vector3();
  private requestedInput: Actions | null = null;
  private engineForce = 0;
  private brakeImpulse = 0;
  private boostForce = 0;
  private hopImpulse = 0;
  private airYawTorque = 0;
  grounded = false;
  boosting = false;
  hopping = false;
  message = '';
  speed = 0;

  constructor(
    readonly world: RAPIER.World,
    readonly spawn: Vector3,
    readonly heading: number,
  ) {
    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(spawn.x, spawn.y, spawn.z)
        .setLinearDamping(tuning.linearDamping)
        .setAngularDamping(tuning.angularDamping)
        .setCcdEnabled(true),
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.88, 0.22, 2.03)
        .setTranslation(0, -0.07, 0)
        .setMass(1300)
        .setFriction(0.3)
        .setRestitution(0.02)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      this.body,
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.65, 0.19, 0.78)
        .setTranslation(0, 0.25, -0.3)
        .setMass(80)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      this.body,
    );
    this.controller = world.createVehicleController(this.body);
    this.controller.indexUpAxis = 1;
    this.controller.setIndexForwardAxis = 2;
    WHEELS.forEach((point, i) => {
      this.controller.addWheel(point, { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, 0.32, 0.34);
      this.controller.setWheelSuspensionStiffness(i, 32);
      this.controller.setWheelSuspensionCompression(i, 4.5);
      this.controller.setWheelSuspensionRelaxation(i, 5.5);
      this.controller.setWheelMaxSuspensionTravel(i, 0.25);
      this.controller.setWheelMaxSuspensionForce(i, 24000);
      this.controller.setWheelFrictionSlip(i, 2.4);
      this.controller.setWheelSideFrictionStiffness(i, 1);
    });
    this.reset(true);
  }

  reset(force = false): void {
    if (this.resetCooldown > 0 && !force) return;
    this.body.setTranslation(this.spawn, true);
    const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), this.heading);
    this.body.setRotation(rotation, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.body.resetForces(true);
    this.body.resetTorques(true);
    this.groundedTicks = 0;
    this.grounded = false;
    this.boosting = false;
    this.hopCooldown = 0.5;
    this.resetCooldown = 1;
    this.steering = 0;
    this.speed = 0;
    this.requestedInput = null;
    this.engineForce =
      this.brakeImpulse =
      this.boostForce =
      this.hopImpulse =
      this.airYawTorque =
        0;
    this.hopping = false;
    this.message = '';
    for (let i = 0; i < 4; i++) {
      this.controller.setWheelSteering(i, 0);
      this.controller.setWheelEngineForce(i, 0);
      this.controller.setWheelBrake(i, 0);
    }
    this.previousPosition.copy(this.spawn);
    this.currentPosition.copy(this.spawn);
    this.previousRotation.copy(rotation);
    this.currentRotation.copy(rotation);
  }

  beforeStep(dt: number, input: Actions): void {
    this.previousPosition.copy(this.currentPosition);
    this.previousRotation.copy(this.currentRotation);
    this.hopCooldown = Math.max(0, this.hopCooldown - dt);
    this.resetCooldown = Math.max(0, this.resetCooldown - dt);
    this.message = '';
    this.hopping = false;
    if (input.reset) this.reset();
    this.requestedInput = { ...input };
    this.boostForce = this.hopImpulse = this.airYawTorque = 0;
    this.body.resetForces(true);
    this.body.resetTorques(true);
    const rotation = this.body.rotation();
    this.currentRotation.set(rotation.x, rotation.y, rotation.z, rotation.w);
    this.forward.set(0, 0, 1).applyQuaternion(this.currentRotation);
    this.velocity.copy(this.body.linvel());
    const forwardSpeed = this.velocity.dot(this.forward);
    this.speed = Math.hypot(this.velocity.x, this.velocity.z);
    // +Z forward / +Y up makes local +X the driver's left.
    // Positive yaw turns left when viewed by the rear chase camera.
    const turn = Number(input.left) - Number(input.right);
    const maxSteer =
      tuning.steeringLowSpeedAngle / (1 + Math.abs(forwardSpeed) * tuning.steeringSpeedFalloff);
    this.steering +=
      (turn * maxSteer - this.steering) * (1 - Math.exp(-dt * tuning.steeringResponse));
    let engine = 0;
    let brake = 0;
    if (input.forward) {
      if (forwardSpeed < -0.8) brake = 65;
      else if (forwardSpeed < tuning.forwardSpeedLimit) engine = tuning.engineForcePerWheel;
    }
    if (input.backward) {
      if (forwardSpeed > 0.8) {
        brake = 80;
        engine = 0;
      } else if (forwardSpeed > -tuning.reverseSpeedLimit) engine = -tuning.reverseForcePerWheel;
    }
    if (input.forward && input.backward) {
      engine = 0;
      brake = 80;
    }
    if (!input.forward && !input.backward) brake = 1.5;
    this.engineForce = engine;
    this.brakeImpulse = brake;
    for (let i = 0; i < 4; i++) {
      this.controller.setWheelEngineForce(i, engine);
      this.controller.setWheelBrake(i, brake);
      this.controller.setWheelSteering(i, i < 2 ? this.steering : 0);
    }
    // Exclude this body's own colliders from suspension queries.
    this.controller.updateVehicle(
      dt,
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
      undefined,
      (c) => c.parent()?.handle !== this.body.handle,
    );
    const contacts = WHEELS.filter((_, i) => this.controller.wheelIsInContact(i)).length;
    this.groundedTicks = contacts >= 2 ? this.groundedTicks + 1 : 0;
    this.grounded = this.groundedTicks >= 3;
    if (input.hop && this.grounded && this.hopCooldown === 0) {
      if (this.pressure.spend(tuning.hopPressure)) {
        const deltaV = Math.max(0, Math.sqrt(2 * 9.81 * tuning.hopHeight) - this.body.linvel().y);
        this.hopImpulse = this.body.mass() * deltaV;
        this.body.applyImpulse({ x: 0, y: this.hopImpulse, z: 0 }, true);
        this.hopCooldown = tuning.hopCooldown;
        this.groundedTicks = 0;
        this.grounded = false;
        this.hopping = true;
      } else this.message = 'Low pressure · coast to recharge';
    }
    this.boosting =
      input.boost &&
      this.speed < tuning.boostSpeedLimit &&
      this.pressure.spend(tuning.boostPressurePerSecond * dt);
    if (this.boosting) {
      this.boostForce = tuning.boostForce;
      this.body.addForce(this.forward.multiplyScalar(this.boostForce), true);
    }
    if (input.boost && !this.boosting && this.pressure.value < 1)
      this.message = 'Low pressure · coast to recharge';
    this.pressure.update(dt, this.grounded, !input.boost && !input.forward && !input.backward);
    if (!this.grounded) {
      // Inertia-scaled attitude assistance: the former fixed 600 Nm yaw torque
      // barely changed the heading of this chassis during a short hop.
      const omega = this.body.angvel();
      const inertia = this.body.principalInertia();
      const cap = (n: number, limit: number) => Math.max(-limit, Math.min(limit, n));
      this.airYawTorque = cap(
        inertia.y *
          (tuning.airYawResponse * (turn * tuning.airYawRate - omega.y) +
            tuning.angularDamping * omega.y),
        tuning.airMaxYawTorque,
      );
      this.up.set(0, 1, 0).applyQuaternion(this.currentRotation);
      this.body.addTorque(
        {
          x: cap(
            inertia.x * (-this.up.z * tuning.airLevelStiffness - omega.x * tuning.airLevelResponse),
            tuning.airMaxLevelTorque,
          ),
          y: this.airYawTorque,
          z: cap(
            inertia.z * (this.up.x * tuning.airLevelStiffness - omega.z * tuning.airLevelResponse),
            tuning.airMaxLevelTorque,
          ),
        },
        true,
      );
    }
    if (this.grounded && turn && this.speed < 0.8)
      this.message = 'Hold W / ↑ or S / ↓ to move · A/D steer while moving';
    const v = this.body.linvel();
    const horizontal = Math.hypot(v.x, v.z);
    if (horizontal > tuning.horizontalSpeedLimit)
      this.body.setLinvel(
        {
          x: (v.x * tuning.horizontalSpeedLimit) / horizontal,
          y: v.y,
          z: (v.z * tuning.horizontalSpeedLimit) / horizontal,
        },
        true,
      );
  }

  afterStep(): void {
    this.currentPosition.copy(this.body.translation());
    const q = this.body.rotation();
    this.currentRotation.set(q.x, q.y, q.z, q.w);
    const velocity = this.body.linvel();
    this.speed = Math.hypot(velocity.x, velocity.z);
  }

  telemetry() {
    const forward = new Vector3(0, 0, 1).applyQuaternion(this.currentRotation);
    const right = new Vector3(-1, 0, 0).applyQuaternion(this.currentRotation);
    const velocity = new Vector3().copy(this.body.linvel());
    return {
      position: this.currentPosition.toArray(),
      velocity: velocity.toArray(),
      heading: Math.atan2(forward.x, forward.z),
      yawRate: this.body.angvel().y,
      steering: this.controller.wheelSteering(0) ?? 0,
      forwardSpeed: velocity.dot(forward),
      lateralSpeed: velocity.dot(right),
      verticalSpeed: velocity.y,
      speed: Math.hypot(velocity.x, velocity.z),
      pressure: this.pressure.value,
      boosting: this.boosting,
      hopping: this.hopping,
      grounded: this.grounded,
      wheelContacts: WHEELS.map((_, i) => this.controller.wheelIsInContact(i)),
      upright: new Vector3(0, 1, 0).applyQuaternion(this.currentRotation).y,
      input: this.requestedInput,
      engineForcePerWheel: this.engineForce,
      brakeImpulsePerWheel: this.brakeImpulse,
      boostForce: this.boostForce,
      hopImpulse: this.hopImpulse,
      airYawTorque: this.airYawTorque,
    };
  }
}
