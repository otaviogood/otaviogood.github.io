function Cell() {
  this.metal = 0;
  this.water = 0;
  this.energy = 0;
  this.people = 0;
  this.units = [ ];
}

////////////////////////////////////////////////////////////////////////////////

function Grid(width, height) {
  this.width = width;
  this.height = height;
  this.cells = [];
  this.totalPeople = 0;

  for (var i = 0; i < width * height; i++) {
    this.cells.push(new Cell);
  }
}

Grid.prototype.point2Dto3D = function(point2D) {
  var theta = fract(point2D.x / this.width) * Math.PI * 2;
  var phi = fract(point2D.y / this.height) * Math.PI;
  return new THREE.Vector3(
    Math.cos(theta) * Math.sin(phi),
    Math.cos(phi),
    Math.sin(theta) * Math.sin(phi));
};

Grid.prototype.roundedPoint3Dto2D = function(point3D) {
  var point2D = this.point3Dto2D(point3D);
  point2D.x = Math.floor(point2D.x) + 0.5;
  point2D.y = Math.floor(point2D.y) + 0.5;
  return point2D;
};

Grid.prototype.point3Dto2D = function(point3D) {
  return new THREE.Vector2(
    fract(Math.atan2(point3D.z, point3D.x) / (Math.PI * 2)) * this.width,
    Math.acos(point3D.y / point3D.length()) / Math.PI * this.height);
};

Grid.prototype.point3DtoCell = function(point3D) {
  return this.point2DtoCell(this.point3Dto2D(point3D));
};

Grid.prototype.point2DtoCell = function(point2D) {
  var cx = Math.floor(point2D.x) % this.width;
  var cy = Math.floor(point2D.y) % this.height;
  return this.cells[cy * this.width + cx];
};

Grid.prototype.seedRandomValues = function(worldMask) {
  for (var i = 0; i < this.cells.length; i++) {
    var cell = this.cells[i];
    cell.people = worldMask[i * 4 + 0] * 1000000;
    cell.metal = worldMask[i * 4 + 1];
    cell.water = worldMask[i * 4 + 2] > 128 ? 1 : 0;
    cell.energy = worldMask[i * 4 + 3];
  }
  this.originalTotalPeople = this.totalPeople = this.computeTotalPeople();
};

Grid.prototype.computeTotalPeople = function() {
  var total = 0;
  for (var i = 0; i < this.cells.length; i++) {
    total += this.cells[i].people;
  }
  return total;
};

Grid.prototype.applyDamange = function(center, radius) {
  for (var y = 0, i = 0; y < this.height; y++) {
    for (var x = 0; x < this.width; x++, i++) {
      var cell = this.cells[i];
      var dx = x + 0.5 - center.x;
      var dy = y + 0.5 - center.y;
      var lengthSquared = dx * dx + dy * dy;
      var oldPeople = cell.people;
      if (lengthSquared < radius * radius) {
        cell.people = 0;
      }
      this.totalPeople += cell.people - oldPeople;
    }
  }
};

////////////////////////////////////////////////////////////////////////////////

function Asteroid(options) {
  var stats = options.stats;
  this.game = options.game;
  this.splitCount = stats.splitCount || 0;
  this.splitStats = stats.splitStats || null;
  this.radius = stats.radius || 0.1;
  this.health = this.maxHealth = stats.health || 1;
  this.damageRadius = stats.damageRadius || 1;
  this.position = options.position;
  this.velocity = options.velocity;

  this.mesh = new THREE.Object3D();//create an empty container


  // Cache stuff for speed
  Asteroid.geometry = Asteroid.geometry || new THREE.SphereGeometry(1, 20, 10);
  Asteroid.material = Asteroid.material || new THREE.MeshLambertMaterial({ map: THREE.ImageUtils.loadTexture('textures/asteroid.jpg') });
  var tempMesh = new THREE.Mesh(Asteroid.geometry, Asteroid.material);
  tempMesh.scale.set(this.radius, this.radius, this.radius);
  tempMesh.rotation.set(
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2);

  this.mesh.add(tempMesh);//add a mesh with geometry to it
//  scene.add(group);//when done, add the group to the scene

  var material7 = new THREE.LineBasicMaterial({ color: 0x00ff00, transparent: true, blending: THREE.AdditiveBlending});
  var geometry7 = new THREE.Geometry();
  geometry7.vertices.push(new THREE.Vector3(0, 0, 0));
  geometry7.vertices.push(this.position.clone().negate());
  this.lineToCenter = new THREE.Line(geometry7, material7);
  this.mesh.add(this.lineToCenter);
}

Asteroid.BASIC_STATS = {
  health: 10,
  radius: 0.05,
  damageRadius: 3
};

Asteroid.SPLITTER_STATS = {
  health: 1,
  radius: 0.1,
  damageRadius: 3,
  splitCount: 2,

  splitStats: {
    health: 1,
    radius: 0.075,
    damageRadius: 2,
    splitCount: 2,

    splitStats: {
      health: 5,
      radius: 0.05,
      damageRadius: 1,
    }
  },
};

Asteroid.prototype.spawnChildren = function() {
  var forward = this.velocity.clone().normalize();
  var basisA = new THREE.Vector3(0, 0, 1).cross(forward).normalize();
  var basisB = basisA.clone().cross(forward).normalize();
  var startingAngle = Math.PI * 2 * Math.random();
  var speed = this.velocity.length();

  for (var i = 0; i < this.splitCount; i++) {
    var angle = startingAngle + i * Math.PI * 2 / this.splitCount;
    this.game.spawnAsteroid({
      stats: this.splitStats,
      position: this.position.clone()
        .add(basisA.clone().multiplyScalar(Math.cos(angle) * this.radius))
        .add(basisB.clone().multiplyScalar(Math.sin(angle) * this.radius)),
      velocity: forward.clone()
        .add(basisA.clone().multiplyScalar(Math.cos(angle) * 0.25))
        .add(basisB.clone().multiplyScalar(Math.sin(angle) * 0.25))
        .multiplyScalar(speed)
    });
  }
};

Asteroid.prototype.takeDamage = function(source, damage) {
  this.health -= damage;
  if (this.health <= 0) {
    this.spawnChildren();
    this.game.explodeAsteroid(this);
  }
};

Asteroid.prototype.update = function(seconds) {
  this.position.add(this.velocity.clone().multiplyScalar(seconds));
  this.mesh.position.copy(this.position);
  this.mesh.matrixWorldNeedsUpdate = true;

  // Make sure the line to the center of the planet is still accurate
  this.lineToCenter.geometry.vertices[1] = this.position.clone().negate();
  this.lineToCenter.geometry.verticesNeedUpdate = true;

  // Hit the planet and explode
  var distanceFromPlanetCenter = this.position.length();
  if (distanceFromPlanetCenter < 1 + this.radius / 2) {
    var oldTotalPeople = this.game.grid.totalPeople;
    this.game.applyDamange(this.game.grid.point3Dto2D(this.position), this.damageRadius);
    this.game.explodeAsteroid(this);
    if (this.game.grid.totalPeople < oldTotalPeople) {
      this.game.shakeCamera();
    }
  }

  // Leave orbit and evaporate
  else if (distanceFromPlanetCenter > 2.5 && this.position.dot(this.velocity) > 0) {
    this.game.removeEntity(this);
  }
};

////////////////////////////////////////////////////////////////////////////////

function Unit(options) {
  this.cell = null;
  this.game = options.game;
  this.name = options.name;
  this.point2D = options.point2D;
  this.point3D = this.game.grid.point2Dto3D(this.point2D);
  this.health = options.health || 1;
  this.mesh = null;
}

Unit.prototype.takeDamage = function(center, radius) {
  if (this.point2D.distanceTo(center) < radius) {
    this.game.explodeUnit(this);
  }
};

Unit.prototype.startWave = function() {
};

Unit.prototype.endWave = function() {
};

Unit.prototype.upgrade = function() {
};

////////////////////////////////////////////////////////////////////////////////

function LaserTurret(options) {
  options.name = options.name || LaserTurret.NAME;
  Unit.call(this, options);
  this.rechargingTime = 0;
  this.level = 0;

  // Cache stuff for speed
  LaserTurret.geometry = LaserTurret.geometry || new THREE.SphereGeometry(0.05, 16, 8);
  LaserTurret.material = LaserTurret.material || new THREE.MeshPhongMaterial({ color: 0xff2020 });
  this.mesh = new THREE.Mesh(LaserTurret.geometry, LaserTurret.material);
  this.mesh.position.copy(this.point3D);
}

LaserTurret.prototype = Object.create(Unit.prototype);

LaserTurret.LEVELS = [
  {
    rechargingTime: 1,
    costPerBeam: 1,
    damagePerBeam: 1,
    beamCount: 1,
  },
  {
    cost: 5,
    rechargingTime: 1,
    costPerBeam: 1,
    damagePerBeam: 2,
    beamCount: 2,
  },
  {
    cost: 10,
    rechargingTime: 1,
    costPerBeam: 1,
    damagePerBeam: 3,
    beamCount: 3,
  },
];

LaserTurret.statsHTMLForLevel = function(level) {
  var stats = LaserTurret.LEVELS[level];
  return (
    '–' + stats.costPerBeam + ' power per beam<br>' +
    '+' + stats.damagePerBeam + ' damage per beam<br>' +
    (stats.beamCount === 1 ? '1 beam' : stats.beamCount + ' beams') + ' per charge'
  );
};

LaserTurret.NAME = 'Laser Turret';
LaserTurret.METAL_COST_FOR_BUILDING = 1;
LaserTurret.BUTTON_TOOLTIP =
  '–' + LaserTurret.METAL_COST_FOR_BUILDING + ' metal to build<br>' +
  LaserTurret.statsHTMLForLevel(0);

LaserTurret.prototype.statsHTML = function() {
  return (
    'Level: ' + (this.level + 1) + '<br>' +
    LaserTurret.statsHTMLForLevel(this.level)
  );
};

LaserTurret.prototype.upgrade = function() {
  if (this.level + 1 < LaserTurret.LEVELS.length) {
    var cost = LaserTurret.LEVELS[this.level + 1].cost;
    if (this.game.metalResourceCount >= cost) {
      this.game.metalResourceCount -= cost;
      this.level++;
    } else {
      this.game.notEnoughMetal();
    }
  }
};

LaserTurret.prototype.update = function(seconds) {
  this.rechargingTime -= seconds;

  // Search for an asteroid to fire at
  if (this.rechargingTime <= 0) {
    var level = LaserTurret.LEVELS[this.level];
    var beamCount = level.beamCount;
    var ignored = [];

    while (beamCount > 0 && this.game.energyResourceCount >= level.costPerBeam) {
      var closestDistance = Infinity;
      var closestAsteroid = null;
      var normal = this.point3D;

      // Always shoot the closest asteroid for less frustrating gameplay
      for (var i = 0; i < this.game.entities.length; i++) {
        var asteroid = this.game.entities[i];
        var toAsteroid = asteroid.mesh.position.clone().sub(this.mesh.position);
        var canSeeAsteroid = toAsteroid.dot(normal) > 0;
        var distance = toAsteroid.length();

        if (asteroid instanceof Asteroid && canSeeAsteroid && distance < closestDistance && ignored.indexOf(asteroid) < 0) {
          closestAsteroid = asteroid;
          closestDistance = distance;
        }
      }

      if (closestAsteroid === null) {
        break;
      }

      this.game.fireLaser(this, closestAsteroid);
      closestAsteroid.takeDamage(this, level.damagePerBeam);
      this.rechargingTime = level.rechargingTime;
      this.game.reduceEnergy(level.costPerBeam);
      beamCount--;

      // Shoot at a different one each time
      ignored.push(closestAsteroid);
    }
  }
};

LaserTurret.prototype.startWave = function() {
  this.rechargingTime = 0.25 + Math.random() * 0.25; // Give the asteroids a chance to be seen
};

////////////////////////////////////////////////////////////////////////////////

function MetalMine(options) {
  options.name = options.name || MetalMine.NAME;
  Unit.call(this, options);

  // Cache stuff for speed
  MetalMine.geometry = MetalMine.geometry || new THREE.SphereGeometry(0.05, 16, 8);
  MetalMine.material = MetalMine.material || new THREE.MeshPhongMaterial({ color: 0xff20ff });
  this.mesh = new THREE.Mesh(MetalMine.geometry, MetalMine.material);
  this.mesh.position.copy(this.point3D);
}

MetalMine.prototype = Object.create(Unit.prototype);

MetalMine.NAME = 'Metal Factory';
MetalMine.METAL_COST_FOR_BUILDING = 1;
MetalMine.METAL_PER_TURN = 3;
MetalMine.STATS = '+' + MetalMine.METAL_PER_TURN + ' metal per turn';
MetalMine.BUTTON_TOOLTIP =
  '–' + MetalMine.METAL_COST_FOR_BUILDING + ' metal to build<br>' +
  MetalMine.STATS;

MetalMine.prototype.statsHTML = function() {
  return MetalMine.STATS;
};

MetalMine.prototype.update = function(seconds) {
};

MetalMine.prototype.endWave = function() {
  this.game.metalResourceCount += MetalMine.METAL_PER_TURN;
};

////////////////////////////////////////////////////////////////////////////////

function EnergyMine(options) {
  options.name = options.name || EnergyMine.NAME;
  Unit.call(this, options);

  // Cache stuff for speed
  EnergyMine.geometry = EnergyMine.geometry || new THREE.SphereGeometry(0.05, 16, 8);
  EnergyMine.material = EnergyMine.material || new THREE.MeshPhongMaterial({ color: 0xffff20 });
  this.mesh = new THREE.Mesh(EnergyMine.geometry, EnergyMine.material);
  this.mesh.position.copy(this.point3D);
}

EnergyMine.prototype = Object.create(Unit.prototype);

EnergyMine.NAME = 'Power Plant';
EnergyMine.METAL_COST_FOR_BUILDING = 2;
EnergyMine.ENERGY_PER_TURN = 3;
EnergyMine.STATS = '+' + EnergyMine.ENERGY_PER_TURN + ' power per turn';
EnergyMine.BUTTON_TOOLTIP =
  '–' + EnergyMine.METAL_COST_FOR_BUILDING + ' metal to build<br>' +
  EnergyMine.STATS;

EnergyMine.prototype.statsHTML = function() {
  return EnergyMine.STATS;
};

EnergyMine.prototype.update = function(seconds) {
};

EnergyMine.prototype.endWave = function() {
  this.game.energyResourceCount += EnergyMine.ENERGY_PER_TURN;
};

////////////////////////////////////////////////////////////////////////////////

var spriteExplosion = THREE.ImageUtils.loadTexture("textures/ExplosionBlur.png");
function ExplosionEffect(options) {
  this.game = options.game;
  this.center = options.center.clone();
  this.radius = options.radius;
  this.duration = options.duration;
  this.elapsed = 0;

  restartAudio(audioExplosion);

  var geometry = new THREE.Geometry();
  for (i = 0; i < 50; i++) {
      var vertex = new THREE.Vector3();
      vertex.x = (Math.random() * 2 - 1) * this.radius;
      vertex.y = (Math.random() * 2 - 1) * this.radius;
      vertex.z = (Math.random() * 2 - 1) * this.radius;
      geometry.vertices.push(vertex);
  }

  this.material = new THREE.PointCloudMaterial({ size: 0.95, map: spriteExplosion, blending: THREE.AdditiveBlending, depthTest: true, depthWrite:false, transparent: true, color: 0x1a100a });

  var particles = new THREE.PointCloud(geometry, this.material);
  particles.rotation.x = Math.random() * 6;
  particles.rotation.y = Math.random() * 6;
  particles.rotation.z = Math.random() * 6;

  this.mesh = particles;
  this.mesh.position.copy(this.center);
}

ExplosionEffect.prototype.update = function(seconds) {
  this.elapsed += seconds;
  var alpha = (this.elapsed / this.duration);
  var smoothAlpha = smoothstep(1.0 - alpha);
  this.material.opacity = Math.pow(smoothAlpha, 0.3);
  //this.material.color.setRGB(50 * smoothAlpha, 40 * smoothAlpha, 10 * smoothAlpha);
  this.mesh.scale.copy(new THREE.Vector3(0.5 + alpha * 1, 0.5 + alpha * 1, 0.5 + alpha * 1));
  this.mesh.matrixWorldNeedsUpdate = true;
  if (this.elapsed >= this.duration) {
    this.game.removeEntity(this);
  }
};

////////////////////////////////////////////////////////////////////////////////

function LaserEffect(options) {
  this.game = options.game;
  this.from = options.from.clone();
  this.to = options.to.clone();
  this.duration = options.duration;
  this.elapsed = 0;
  var delta = this.to.clone();
  delta.sub(this.from)
  var deltaHalf = delta.clone();
  deltaHalf.multiplyScalar(0.5)
  var midPoint = this.from.clone()
  midPoint.add(deltaHalf)
  var len = delta.length()
  delta.normalize()
  var geometry = new THREE.CylinderGeometry( 0.005, 0.005, len, 32 );
  this.material = new THREE.MeshBasicMaterial( {color: 0xff0000} );
  this.material.transparent = true
  this.mesh = new THREE.Mesh(geometry, this.material);
  var matrix = new THREE.Matrix4();
  matrix.makeRotationX(0.5 * Math.PI);
  this.mesh.applyMatrix(matrix);
  matrix.lookAt(this.from, this.to, new THREE.Vector3(0, 0, 1));
  this.mesh.applyMatrix(matrix);
  this.mesh.position.copy(midPoint);
  this.mesh.matrixWorldNeedsUpdate = true;
}

LaserEffect.prototype.update = function(seconds) {
  this.elapsed += seconds;
  this.material.opacity = 1.0 - (this.elapsed / this.duration);
  if (this.elapsed >= this.duration) {
    this.game.removeEntity(this);
  }
};

////////////////////////////////////////////////////////////////////////////////

function SurfaceRing(options) {
  this.game = options.game;
  this.point2D = options.point2D;
  this.point3D = this.game.grid.point2Dto3D(this.point2D);
  this.radius = options.radius || 1;

  // Cache stuff for speed
  var color = options.color || 0xffff00;
  SurfaceRing.geometry = SurfaceRing.geometry || new THREE.RingGeometry(0.9, 1, 32);
  var material = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
  this.mesh = new THREE.Mesh(SurfaceRing.geometry, material);

  // Orient to the planet surface
  this.moveTo(this.point2D);
}

SurfaceRing.prototype.moveTo = function(point2D) {
  this.point2D = point2D;
  this.point3D = this.game.grid.point2Dto3D(this.point2D);

  this.mesh.matrix.identity();
  this.mesh.applyMatrix(new THREE.Matrix4().lookAt(this.point3D, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1)));
  this.mesh.position.copy(this.point3D);
  this.mesh.scale.set(this.radius, this.radius, this.radius);
  this.mesh.matrixWorldNeedsUpdate = true;
};

SurfaceRing.prototype.update = function(seconds) {
};

////////////////////////////////////////////////////////////////////////////////

function Game(options) {
  this.entities = [];
  this.cameraRadius = Game.PLANNING_CAMERA_RADIUS;
  this.scene = options.scene;
  this.grid = new Grid(options.width, options.height);
  this.camera = options.camera;
  this.uniforms = options.uniforms;
  this.cameraAngle = 0;
  this.metalResourceCount = Game.STARTING_METAL_COUNT;
  this.energyResourceCount = Game.STARTING_ENERGY_COUNT;
  this.ui = null; // Filled in by UI constructor
  this.currentState = Game.State.PLANNING;
  this.cameraShakeScale = 0;

  this.waves = [
    {
      count: 3,
      stats: Asteroid.BASIC_STATS,
      speed: 0.1,
      delay: 10,
    },
    {
      count: 4,
      stats: Asteroid.BASIC_STATS,
      speed: 0.1,
      delay: 10,
    },
    {
      count: 5,
      stats: Asteroid.BASIC_STATS,
      speed: 0.1,
      delay: 10,
    },
    {
      count: 6,
      stats: Asteroid.BASIC_STATS,
      speed: 0.1,
      delay: 10,
    },
    {
      count: 7,
      stats: Asteroid.BASIC_STATS,
      speed: 0.1,
      delay: 10,
    },
    {
      count: 1,
      stats: Asteroid.SPLITTER_STATS,
      speed: 0.1,
      delay: 10,
    },
    {
      count: 3,
      stats: Asteroid.SPLITTER_STATS,
      speed: 0.1,
      delay: 10,
    },
    {
      count: 5,
      stats: Asteroid.SPLITTER_STATS,
      speed: 0.1,
      delay: 10,
    },
    {
      count: 7,
      stats: Asteroid.SPLITTER_STATS,
      speed: 0.1,
      delay: 10,
    },
    {
      count: 9,
      stats: Asteroid.SPLITTER_STATS,
      speed: 0.1,
      delay: 10,
    },
    {
      count: 11,
      stats: Asteroid.SPLITTER_STATS,
      speed: 0.1,
      delay: 10,
    },
  ];

  // This contains delays in seconds before asteroids fall
  this.asteroidQueue = [];

  // Returns an entity
  this.intersectScene = function(x, y) {
    var intersections = options.intersectScene(x, y);
    if (intersections.length > 0) {
      var mesh = intersections[0].object;
      for (var i = 0; i < this.entities.length; i++) {
        var entity = this.entities[i];
        if (entity.mesh === mesh) {
          return entity;
        }
      }
    }
    return null;
  }.bind(this);

  // Returns a THREE.Vector3
  this.intersectWorld = function(x, y) {
    var intersections = options.intersectWorld(x, y);
    return intersections.length > 0 ? intersections[0].point : null;
  };

  this.currentWaveNumber = 1;
  this.updateCameraAngle(this.cameraAngle);
  this.hideGridCursor();
}

Game.State = {
  PLANNING: 0,
  WAVE: 1
};

Game.STARTING_METAL_COUNT = 10;
Game.STARTING_ENERGY_COUNT = 15;
Game.ENERGY_INCOME_PER_TURN = 0;
Game.METAL_INCOME_PER_TURN = 1; // Avoid never being able to create a mine
Game.PLANNING_CAMERA_RADIUS = 3;
Game.WAVE_CAMERA_RADIUS = 5;

Game.prototype.shakeCamera = function() {
  this.cameraShakeScale = 1;
};

Game.prototype.project3DtoScreen = function(point3D) {
  var position = point3D.project(this.camera);
  if (position.z < 1) {
    var x = (0.5 + position.x * 0.5) * innerWidth;
    var y = (0.5 - position.y * 0.5) * innerHeight - 10;
    return new THREE.Vector2(x, y);
  }
  return null;
};

Game.prototype.update = function(seconds) {
  // Make a copy to avoid mutation during iteration issues
  var copy = this.entities.slice();
  for (var i = 0; i < copy.length; i++) {
    copy[i].update(seconds);
  }

  // Go back to planning when all asteroids are gone
  if (this.currentState === Game.State.WAVE) {
    for (var i = 0; i < this.entities.length; i++) {
      var entity = this.entities[i];
      if (entity instanceof Asteroid) {
        break;
      }
    }
    if (i === this.entities.length) {
      this.endWave();
    }
  }

  // Move the camera in and out depending on the mode
  var isPlanning = this.currentState === Game.State.PLANNING;
  var targetCameraRadius = isPlanning ? Game.PLANNING_CAMERA_RADIUS : Game.WAVE_CAMERA_RADIUS;
  this.cameraRadius = targetCameraRadius + (this.cameraRadius - targetCameraRadius) * Math.pow(isPlanning ? 0.25 : 0.75, seconds);

  // Update the camera every frame for camera shake
  var shake = uniformlyRandomDirection().multiplyScalar(this.cameraShakeScale * 0.01);
  this.cameraShakeScale = Math.max(this.cameraShakeScale - 5 * seconds, 0);
  this.camera.position.set(Math.sin(this.cameraAngle) * this.cameraRadius, 0, Math.cos(this.cameraAngle) * this.cameraRadius);
  this.camera.position.add(shake);
  this.camera.lookAt(shake);
  this.camera.matrixWorldNeedsUpdate = true;
};

Game.prototype.addUnit = function(unit) {
  unit.cell = this.grid.point2DtoCell(unit.point2D);
  if (unit.cell) {
    unit.cell.units.push(unit);
  }
  this.addEntity(unit);
};

Game.prototype.removeUnit = function(unit) {
  if (unit.cell) {
    removeFromArray(unit, unit.cell.units);
    unit.cell = null;
  }
  this.removeEntity(unit);
};

Game.prototype.addEntity = function(entity) {
  var index = this.entities.indexOf(entity);
  if (index < 0) {
    this.entities.push(entity);
    if (entity.mesh) {
      this.scene.add(entity.mesh);
    }
  }
};

Game.prototype.removeEntity = function(entity) {
  if (removeFromArray(entity, this.entities)) {
    if (entity.mesh) {
      this.scene.remove(entity.mesh);
    }
  }
};

Game.prototype.spawnAsteroid = function(options) {
  var target2D = options.target2D || new THREE.Vector2(
    this.grid.width * (Math.random()),
    this.grid.height * (Math.random() * 0.5 + 0.25));
  var normal = this.grid.point2Dto3D(target2D);
  var velocity = options.velocity || normal.clone().multiplyScalar(-options.speed);
  var position = options.position || normal.clone().sub(velocity.clone().multiplyScalar(options.delay));

  this.addEntity(new Asteroid({
    game: this,
    position: position,
    velocity: velocity,
    stats: options.stats,
  }));
};

Game.prototype.canPlaceUnit = function(options) {
  var cell = this.grid.point3DtoCell(options.point3D);
  if (cell && cell.units.length === 0 && (!options.validateCell || options.validateCell(cell))) {
    return true;
  }
  return false;
};

Game.prototype.placeLaserTurret = function(point3D) {
  if (this.metalResourceCount >= LaserTurret.METAL_COST_FOR_BUILDING) {
    this.reduceMetal(LaserTurret.METAL_COST_FOR_BUILDING);
    this.addUnit(new LaserTurret({
      game: this,
      point2D: this.grid.roundedPoint3Dto2D(point3D),
    }));
  } else {
    this.notEnoughMetal();
  }
};

Game.prototype.placeMetalMine = function(point3D) {
  if (this.metalResourceCount >= MetalMine.METAL_COST_FOR_BUILDING) {
    this.reduceMetal(MetalMine.METAL_COST_FOR_BUILDING);
    this.addUnit(new MetalMine({
      game: this,
      point2D: this.grid.roundedPoint3Dto2D(point3D),
    }));
  } else {
    this.notEnoughMetal();
  }
};

Game.prototype.placeEnergyMine = function(point3D) {
  if (this.metalResourceCount >= EnergyMine.METAL_COST_FOR_BUILDING) {
    this.reduceMetal(EnergyMine.METAL_COST_FOR_BUILDING);
    this.addUnit(new EnergyMine({
      game: this,
      point2D: this.grid.roundedPoint3Dto2D(point3D),
    }));
  } else {
    this.notEnoughMetal();
  }
};

Game.prototype.fireLaser = function(turret, asteroid) {
  restartAudio(audioEffect07);
  var effect = new LaserEffect({
    game: this,
    from: turret.mesh.position,
    to: asteroid.mesh.position,
    duration: 0.15
  });
  this.addEntity(effect);
};

Game.prototype.explodeAsteroid = function(asteroid) {
    var effect = new ExplosionEffect({
    game: this,
    center: asteroid.mesh.position,
    radius: asteroid.radius * 1.0,
    duration: 1.5
  });
  this.addEntity(effect);
  this.removeEntity(asteroid);
};

Game.prototype.explodeUnit = function(unit) {
  this.removeUnit(unit);
};

Game.prototype.updateCameraAngle = function(cameraAngle) {
  this.cameraAngle = cameraAngle;
};

Game.prototype.applyDamange = function(center, radius) {
  this.grid.applyDamange(center, radius);

  // Make a copy to avoid mutation during iteration issues
  var copy = this.entities.slice();
  for (var i = 0; i < copy.length; i++) {
    var entity = copy[i];
    if (entity instanceof Unit) {
      entity.takeDamage(center, radius);
    }
  }

  if (this.grid.totalPeople < 1) {
    this.ui.showLoseScreen();
  }
};

Game.prototype.showGridCursor = function(point2D) {
  this.uniforms.gridPos.value = new THREE.Vector3(point2D.x, point2D.y, 1);
  this.uniforms.needsUpdate = true;
};

Game.prototype.hideGridCursor = function() {
  this.uniforms.gridPos.value = new THREE.Vector3(0, 0, 0);
  this.uniforms.needsUpdate = true;
};

Game.prototype.startWave = function() {
  this.currentState = Game.State.WAVE;
  restartAudio(audioEffect02);

  for (var i = 0; i < this.entities.length; i++) {
    var entity = this.entities[i];
    if (entity instanceof Unit) {
      entity.startWave();
    }
  }

  var wave = this.waves.shift();
  if (wave) {
    for (var i = 0; i < wave.count; i++) {
      var t = (i + Math.random()) / wave.count;
      this.spawnAsteroid({
        stats: wave.stats,
        speed: wave.speed * (1 + 0.2 * t),
        delay: wave.delay * (1 + 0.4 * t),
      });
    }
  }
};

Game.prototype.endWave = function() {
  this.currentState = Game.State.PLANNING;
  this.ui.updateWaveCount(++this.currentWaveNumber);

  this.energyResourceCount += Game.ENERGY_INCOME_PER_TURN;
  this.metalResourceCount += Game.METAL_INCOME_PER_TURN;

  for (var i = 0; i < this.entities.length; i++) {
    var entity = this.entities[i];
    if (entity instanceof Unit) {
      entity.endWave();
    }
  }

  if (this.waves.length === 0) {
    setTimeout(function() {
      this.ui.showWinScreen();
    }.bind(this), 500);
  }
};

Game.prototype.notEnoughMetal = function() {
  this.ui.showErrorMessage('Not enough metal!');
  restartAudio(audioOutOfMetal);
};

Game.prototype.reduceMetal = function(amount) {
  this.metalResourceCount = Math.max(this.metalResourceCount - amount, 0);
  if (this.metalResourceCount <= 0) {
    this.notEnoughMetal();
  }
};

Game.prototype.reduceEnergy = function(amount) {
  this.energyResourceCount = Math.max(this.energyResourceCount - amount, 0);
  if (this.energyResourceCount <= 0) {
    this.ui.showErrorMessage('Out of power!');
    restartAudio(audioOutOfEnergy);
  }
};

////////////////////////////////////////////////////////////////////////////////

function fract(n) {
  return n - Math.floor(n);
}

function uniformlyRandomDirection() {
  var angle = Math.random() * Math.PI * 2;
  var z = Math.random() * 2 - 1;
  var scale = Math.sqrt(1 - z * z);
  return new THREE.Vector3(
    Math.cos(angle) * scale,
    Math.sin(angle) * scale,
    z);
}

function smoothstep(x) {
    return x * x * (3 - 2 * x);
}

function removeFromArray(e, arr) {
  var index = arr.indexOf(e);
  if (index >= 0) {
    arr.splice(index, 1);
    return true;
  }
  return false;
}

function restartAudio(audio) {
  audio.src = audio.src;
  audio.currentTime = 0;
  audio.play();
}
