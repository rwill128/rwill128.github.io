import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const EPSILON = 1e-9;

function sceneVector(vector, radius = 1) {
  return new THREE.Vector3(vector.x * radius, vector.z * radius, vector.y * radius);
}

export class BlochRenderer {
  constructor({ stage, canvas, labelsLayer, color }) {
    this.stage = stage;
    this.canvas = canvas;
    this.labelsLayer = labelsLayer;
    this.radius = 1.12;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(3.35, 2.35, 4.05);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.enablePan = false;
    this.controls.minDistance = 3.1;
    this.controls.maxDistance = 6.5;

    this.scene.add(new THREE.HemisphereLight(0xe8fff8, 0x1d2723, 1.4));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2);
    keyLight.position.set(3, 4, 5);
    this.scene.add(keyLight);

    this.scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(this.radius, 52, 28),
      new THREE.MeshPhysicalMaterial({
        color: 0x91aaa2,
        transparent: true,
        opacity: 0.055,
        roughness: 0.45,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    ));

    this.gridMaterial = new THREE.LineBasicMaterial({
      color: 0x8da198,
      transparent: true,
      opacity: 0.26,
    });
    this.emphasizedGridMaterial = new THREE.LineBasicMaterial({
      color: 0xc4d1ca,
      transparent: true,
      opacity: 0.56,
    });

    this.makeCircle((angle) => new THREE.Vector3(
      Math.cos(angle) * this.radius,
      0,
      Math.sin(angle) * this.radius,
    ), this.emphasizedGridMaterial);

    for (const phi of [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) {
      this.makeCircle((angle) => new THREE.Vector3(
        Math.sin(angle) * Math.cos(phi) * this.radius,
        Math.cos(angle) * this.radius,
        Math.sin(angle) * Math.sin(phi) * this.radius,
      ), phi === 0 || phi === Math.PI / 2
        ? this.emphasizedGridMaterial
        : this.gridMaterial);
    }

    for (const latitude of [Math.PI / 4, (3 * Math.PI) / 4]) {
      const horizontalRadius = Math.sin(latitude) * this.radius;
      const height = Math.cos(latitude) * this.radius;
      this.makeCircle((angle) => new THREE.Vector3(
        Math.cos(angle) * horizontalRadius,
        height,
        Math.sin(angle) * horizontalRadius,
      ), this.gridMaterial);
    }

    const axisLength = this.radius * 1.24;
    this.addAxis(
      new THREE.Vector3(-axisLength, 0, 0),
      new THREE.Vector3(axisLength, 0, 0),
      0xe05b4f,
    );
    this.addAxis(
      new THREE.Vector3(0, 0, -axisLength),
      new THREE.Vector3(0, 0, axisLength),
      0x4a8a60,
    );
    this.addAxis(
      new THREE.Vector3(0, -axisLength, 0),
      new THREE.Vector3(0, axisLength, 0),
      0x40d2d6,
    );

    this.shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 1, 16),
      new THREE.MeshBasicMaterial({ color }),
    );
    this.tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.048, 20, 14),
      new THREE.MeshBasicMaterial({ color }),
    );
    this.scene.add(this.shaft, this.tip);

    this.previousLine = this.makeLine(
      [new THREE.Vector3(), new THREE.Vector3()],
      new THREE.LineDashedMaterial({
        color: 0xdca22e,
        transparent: true,
        opacity: 0.7,
        dashSize: 0.06,
        gapSize: 0.04,
      }),
    );
    this.previousLine.visible = false;
    this.previousTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 16, 10),
      new THREE.MeshBasicMaterial({ color: 0xdca22e }),
    );
    this.previousTip.visible = false;
    this.scene.add(this.previousTip);

    const labelDefinitions = [
      { text: "|0⟩", point: new THREE.Vector3(0, axisLength + 0.08, 0) },
      { text: "|1⟩", point: new THREE.Vector3(0, -axisLength - 0.08, 0) },
      { text: "|+⟩", point: new THREE.Vector3(axisLength + 0.08, 0, 0) },
      { text: "|−⟩", point: new THREE.Vector3(-axisLength - 0.08, 0, 0) },
      { text: "|+i⟩", point: new THREE.Vector3(0, 0, axisLength + 0.08) },
      { text: "|−i⟩", point: new THREE.Vector3(0, 0, -axisLength - 0.08) },
      { text: "Z", point: new THREE.Vector3(0.08, axisLength * 0.75, 0), axis: true },
      { text: "X", point: new THREE.Vector3(axisLength * 0.75, 0.08, 0), axis: true },
      { text: "Y", point: new THREE.Vector3(0, 0.08, axisLength * 0.75), axis: true },
    ];

    this.labels = labelDefinitions.map((definition) => {
      const element = document.createElement("span");
      element.className = `sphere-label${definition.axis ? " axis-label" : ""}`;
      element.textContent = definition.text;
      labelsLayer.appendChild(element);
      return { ...definition, element };
    });

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(stage);
  }

  makeLine(points, material = this.gridMaterial) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    return line;
  }

  makeCircle(factory, material) {
    const points = [];
    for (let index = 0; index <= 96; index += 1) {
      points.push(factory((index / 96) * Math.PI * 2));
    }
    return this.makeLine(points, material);
  }

  addAxis(from, to, color) {
    this.makeLine([from, to], new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
    }));
  }

  setLine(line, points, dashed = false) {
    line.geometry.dispose();
    line.geometry = new THREE.BufferGeometry().setFromPoints(points);
    if (dashed) line.computeLineDistances();
  }

  setArrow(vector, shaft, tip) {
    const length = Math.min(1, Math.max(0, vector.length));
    if (length < EPSILON) {
      shaft.visible = false;
      tip.visible = false;
      return;
    }
    const direction = sceneVector(vector).normalize();
    const arrowLength = this.radius * length;
    shaft.visible = true;
    tip.visible = true;
    shaft.position.copy(direction).multiplyScalar(arrowLength / 2);
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    shaft.scale.set(1, arrowLength, 1);
    tip.position.copy(direction).multiplyScalar(arrowLength);
  }

  update(vector, previousVector = null) {
    this.setArrow(vector, this.shaft, this.tip);
    if (previousVector && previousVector.length > EPSILON) {
      const previousTip = sceneVector(previousVector).normalize()
        .multiplyScalar(this.radius * Math.min(1, previousVector.length));
      this.previousLine.visible = true;
      this.previousTip.visible = true;
      this.previousTip.position.copy(previousTip);
      this.setLine(this.previousLine, [new THREE.Vector3(), previousTip], true);
    } else {
      this.previousLine.visible = false;
      this.previousTip.visible = false;
    }
  }

  resize() {
    const width = this.stage.clientWidth;
    const height = this.stage.clientHeight;
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    const expectedWidth = Math.floor(width * pixelRatio);
    const expectedHeight = Math.floor(height * pixelRatio);
    if (this.canvas.width === expectedWidth && this.canvas.height === expectedHeight) return;
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  projectLabels() {
    const width = this.stage.clientWidth;
    const height = this.stage.clientHeight;
    this.labels.forEach(({ point, element }) => {
      const projected = point.clone().project(this.camera);
      element.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
      element.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
      element.style.opacity = projected.z > 1 ? "0" : "1";
    });
  }

  render() {
    this.resize();
    this.controls.update();
    this.projectLabels();
    this.renderer.render(this.scene, this.camera);
  }
}
