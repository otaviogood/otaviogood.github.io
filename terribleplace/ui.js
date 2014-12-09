function UI(game) {
  this.game = game;
  this.game.ui = this;
  this.element = div({ css: 'ui' });
  this.gameElement = div({ css: 'game', parent: this.element });
  this.statsElement = div({ css: 'stats', parent: this.element });
  this.buttonsElement = div({ css: 'buttons', parent: this.gameElement });
  this.statusElement = div({ css: 'status', parent: this.gameElement });
  this.crosshairElementX = div({ css: 'crosshair-x', parent: this.gameElement });
  this.crosshairElementY = div({ css: 'crosshair-y', parent: this.gameElement });
  this.entityLayerElement = div({ css: 'entities', parent: this.gameElement });
  this.placeLaserTurretButton = div({ css: 'button', parent: this.buttonsElement, text: 'Place ' + LaserTurret.NAME + ' (1 key)' });
  this.placeMetalMineButton = div({ css: 'button', parent: this.buttonsElement, text: 'Place ' + MetalMine.NAME + ' (2 key)' });
  this.placeEnergyMineButton = div({ css: 'button', parent: this.buttonsElement, text: 'Place ' + EnergyMine.NAME + ' (3 key)' });
  this.upgradeUnitButton = div({ css: 'button', parent: this.buttonsElement, text: 'Upgrade Laser Turret (4 key)' });
  this.startWaveButton = div({ css: 'button', parent: this.buttonsElement, text: 'Start Wave' });
  this.buttonTooltipElement = div({ css: 'button-tooltip', parent: this.gameElement });
  this.errorElement = div({ css: 'out-of', parent: this.gameElement });
  this.waveNameElement = div({ css: 'wave-name', parent: this.gameElement, text: 'Wave 1' });
  this.gameOverElement = div({ css: 'game-over', parent: this.gameElement });
  this.introElement = div({ css: 'intro', parent: this.gameElement });
  this.errorTimeout = 0;
  this.mode = UI.Mode.INTRO_SCREEN;
  this.entityType = UI.EntityType.LASER_TURRET;
  this.introElement.innerHTML = document.title + '<p>Click to start';

  this.buttonTooltipElement.innerHTML =
    '<div class="button-tooltip-name"></div>' +
    '<div class="button-tooltip-text"></div>';
  var divs = this.buttonTooltipElement.getElementsByTagName('div');
  this.buttonTooltipName = divs[0];
  this.buttonTooltipText = divs[1];

  this.statsElement.innerHTML =
    '<div class="stats-name"></div>' +
    '<div class="stats-text"></div>';
  var divs = this.statsElement.getElementsByTagName('div');
  this.statsNameElement = divs[0];
  this.statsTextElement = divs[1];

  this.statusElement.innerHTML =
    '<span class="status-label"><span class="ring" style="border-color:yellow;"></span>Power: </span><span class="status-value" id="status-energy"></span><br>' +
    '<span class="status-label"><span class="ring" style="border-color:magenta;"></span>Metal: </span><span class="status-value" id="status-metal"></span><br>' +
    '<span class="status-label"><span class="ring" style="border-color:cyan;"></span>Population: </span><span class="status-value" id="status-population"></span>';
  this.energyElement = this.statusElement.querySelector('#status-energy');
  this.metalElement = this.statusElement.querySelector('#status-metal');
  this.populationElement = this.statusElement.querySelector('#status-population');

  var oldX = 0;

  document.addEventListener('keydown', function(e) {
    if (this.game.currentState !== Game.State.PLANNING ||
        this.mode === UI.Mode.INTRO_SCREEN ||
        this.mode === UI.Mode.GAME_OVER ||
        this.mode === UI.Mode.DRAG_CAMERA_GAME_OVER) {
      return;
    }
    var ESCAPE = 27;
    var index = e.which - '1'.charCodeAt();
    if (index >= 0 && index < UI.EntityType.COUNT) {
      this.startPlacingEntity(index);
    }
    else if (index === UI.EntityType.COUNT) {
      this.switchToMode(UI.Mode.UPGRADE_UNIT);
    }
    else if (e.which === ESCAPE && (this.mode === UI.Mode.PLACE_UNIT || this.mode === UI.Mode.UPGRADE_UNIT)) {
      this.switchToMode(UI.Mode.IN_GAME);
    }
  }.bind(this));

  this.element.onmousedown = function(e) {
    e.preventDefault();
    switch (this.mode) {
      case UI.Mode.IN_GAME: {
        if (this.game.currentState === Game.State.PLANNING) {
          if (e.target === this.startWaveButton) {
            this.game.startWave();
            return;
          }

          else if (e.target === this.upgradeUnitButton) {
            this.switchToMode(UI.Mode.UPGRADE_UNIT);
            this.element.onmousemove(e);
            return;
          }

          else {
            for (var i = 0; i < UI.EntityType.COUNT; i++) {
              if (e.target === this.elementForEntityType(i)) {
                this.startPlacingEntity(i);
                this.element.onmousemove(e);
                return;
              }
            }
          }
        }

        oldX = e.pageX;
        this.switchToMode(UI.Mode.DRAG_CAMERA);
        break;
      }

      case UI.Mode.INTRO_SCREEN: {
        this.switchToMode(UI.Mode.IN_GAME);
        break;
      }

      case UI.Mode.GAME_OVER: {
        oldX = e.pageX;
        this.switchToMode(UI.Mode.DRAG_CAMERA_GAME_OVER);
        break;
      }

      case UI.Mode.PLACE_UNIT: {
        var point3D = this.game.intersectWorld(e.pageX, e.pageY);
        if (point3D) {
          switch (this.entityType) {
            case UI.EntityType.LASER_TURRET: {
              if (!this.game.canPlaceUnit({ point3D: point3D, validateCell: function(cell) { return !cell.water; } })) {
                return;
              }
              this.game.placeLaserTurret(point3D);
              break;
            }
            case UI.EntityType.METAL_MINE: {
              if (!this.game.canPlaceUnit({ point3D: point3D, validateCell: function(cell) { return !cell.water && cell.metal > 0; } })) {
                return;
              }
              this.game.placeMetalMine(point3D);
              break;
            }
            case UI.EntityType.ENERGY_MINE: {
              if (!this.game.canPlaceUnit({ point3D: point3D, validateCell: function(cell) { return !cell.water && cell.energy > 0; } })) {
                return;
              }
              this.game.placeEnergyMine(point3D);
              break;
            }
          }
          audioEffect06.src = audioEffect06.src;
          //audioEffect06.currentTime = 0;
          audioEffect06.play();
        }
        this.switchToMode(UI.Mode.IN_GAME);
        break;
      }

      case UI.Mode.UPGRADE_UNIT: {
        var entity = this.game.intersectScene(e.pageX, e.pageY);
        if (entity instanceof Unit) {
          entity.upgrade();
          this.showHoverStats(entity);
        }
        this.switchToMode(UI.Mode.IN_GAME);
        break;
      }
    }
  }.bind(this);

  this.element.onmousemove = function(e) {
    this.crosshairElementX.style.left = e.pageX;
    this.crosshairElementY.style.top = e.pageY;

    switch (this.mode) {
      case UI.Mode.IN_GAME: {
        switch (e.target) {
          case this.placeLaserTurretButton: {
            this.showButtonTooltip({
              element: this.placeLaserTurretButton,
              cost: LaserTurret.METAL_COST_FOR_BUILDING,
              name: LaserTurret.NAME,
              html: LaserTurret.BUTTON_TOOLTIP
            });
            break;
          }

          case this.placeEnergyMineButton: {
            this.showButtonTooltip({
              element: this.placeEnergyMineButton,
              cost: EnergyMine.METAL_COST_FOR_BUILDING,
              name: EnergyMine.NAME,
              html: EnergyMine.BUTTON_TOOLTIP
            });
            break;
          }

          case this.placeMetalMineButton: {
            this.showButtonTooltip({
              element: this.placeMetalMineButton,
              cost: MetalMine.METAL_COST_FOR_BUILDING,
              name: MetalMine.NAME,
              html: MetalMine.BUTTON_TOOLTIP
            });
            break;
          }

          case this.upgradeUnitButton: {
            this.showButtonTooltip({
              element: this.upgradeUnitButton,
              name: 'Upgrade Laser Turret',
              html:
                'Click this, then click a laser turret<br><br>' +
                'Level 2: ' + LaserTurret.LEVELS[1].beamCount + ' beams, +' + LaserTurret.LEVELS[1].damagePerBeam + ' damage each, costs ' + LaserTurret.LEVELS[1].cost + ' metal<br>' +
                'Level 3: ' + LaserTurret.LEVELS[2].beamCount + ' beams, +' + LaserTurret.LEVELS[2].damagePerBeam + ' damage each, costs ' + LaserTurret.LEVELS[2].cost + ' metal'
            });
            break;
          }

          default: {
            this.showButtonTooltip(null);
            break;
          }
        }
        this.showHoverStats(this.game.intersectScene(e.pageX, e.pageY));
        break;
      }

      case UI.Mode.DRAG_CAMERA:
      case UI.Mode.DRAG_CAMERA_GAME_OVER: {
        var deltaAngle = -(e.pageX - oldX) * 0.01;
        this.game.updateCameraAngle(this.game.cameraAngle + deltaAngle);
        oldX = e.pageX;
        break;
      }

      case UI.Mode.PLACE_UNIT: {
        this.updateGridCursor(e.pageX, e.pageY);
        break;
      }

      case UI.Mode.UPGRADE_UNIT: {
        this.showHoverStats(this.game.intersectScene(e.pageX, e.pageY));
        break;
      }
    }
  }.bind(this);

  this.element.onmouseup = function(e) {
    switch (this.mode) {
      case UI.Mode.DRAG_CAMERA: {
        this.switchToMode(UI.Mode.IN_GAME);
        break;
      }

      case UI.Mode.DRAG_CAMERA_GAME_OVER: {
        this.switchToMode(UI.Mode.GAME_OVER);
        break;
      }
    }
  }.bind(this);

  this.element.onmousewheel = function(e) {
    this.game.updateCameraAngle(this.game.cameraAngle + e.deltaX / 150);
  }.bind(this);
}

UI.Mode = {
  INTRO_SCREEN: 0,
  IN_GAME: 1,
  DRAG_CAMERA: 2,
  PLACE_UNIT: 3,
  UPGRADE_UNIT: 4,
  GAME_OVER: 5,
  DRAG_CAMERA_GAME_OVER: 6
};

UI.EntityType = {
  LASER_TURRET: 0,
  METAL_MINE: 1,
  ENERGY_MINE: 2,

  COUNT: 3
};

UI.prototype.updateWaveCount = function(count) {
  this.waveNameElement.textContent = 'Wave ' + count;
};

UI.prototype.updateGridCursor = function(x, y) {
  var point3D = this.game.intersectWorld(x, y);
  if (point3D) {
    this.game.showGridCursor(this.game.grid.point3Dto2D(point3D));
  } else {
    this.game.hideGridCursor();
  }
};

UI.prototype.startPlacingEntity = function(entityType) {
  this.switchToMode(UI.Mode.IN_GAME);
  if (this.game.currentState === Game.State.PLANNING) {
    if (this.game.metalResourceCount >= this.metalCostForEntityType(entityType)) {
      this.entityType = entityType;
      this.switchToMode(UI.Mode.PLACE_UNIT);
    } else {
      this.game.notEnoughMetal();
    }
  }
};

UI.prototype.metalCostForEntityType = function(entityType) {
  switch (entityType) {
    case UI.EntityType.LASER_TURRET: return LaserTurret.METAL_COST_FOR_BUILDING;
    case UI.EntityType.METAL_MINE: return MetalMine.METAL_COST_FOR_BUILDING;
    case UI.EntityType.ENERGY_MINE: return EnergyMine.METAL_COST_FOR_BUILDING;
    default: return 0;
  }
};

UI.prototype.elementForEntityType = function(entityType) {
  switch (entityType) {
    case UI.EntityType.LASER_TURRET: return this.placeLaserTurretButton;
    case UI.EntityType.METAL_MINE: return this.placeMetalMineButton;
    case UI.EntityType.ENERGY_MINE: return this.placeEnergyMineButton;
  }
};

UI.prototype.setCursor = function(cursor) {
  this.element.style.cursor = cursor;
};

UI.prototype.deactivateButtons = function() {
  var children = this.buttonsElement.childNodes;
  for (var i = 0; i < children.length; i++) {
    children[i].classList.remove('active');
  }
  this.buttonsElement.classList.remove('active');
};

UI.prototype.switchToMode = function(mode) {
  if (this.mode === mode) {
    return;
  }

  switch (this.mode) {
    case UI.Mode.PLACE_UNIT:
    case UI.Mode.UPGRADE_UNIT: {
      this.deactivateButtons();
      this.game.hideGridCursor();
      hide(this.crosshairElementX);
      hide(this.crosshairElementY);
      break;
    }

    case UI.Mode.INTRO_SCREEN: {
      hide(this.introElement);
      break;
    }
  }

  this.mode = mode;

  switch (this.mode) {
    case UI.Mode.IN_GAME: {
      this.showButtonTooltip(null);
      this.setCursor('ew-resize');
      break;
    }

    case UI.Mode.PLACE_UNIT: {
      this.buttonsElement.classList.add('active');
      this.elementForEntityType(this.entityType).classList.add('active');
      show(this.crosshairElementX);
      show(this.crosshairElementY);
      this.setCursor('crosshair');
      break;
    }

    case UI.Mode.UPGRADE_UNIT: {
      this.buttonsElement.classList.add('active');
      this.upgradeUnitButton.classList.add('active');
      show(this.crosshairElementX);
      show(this.crosshairElementY);
      this.setCursor('crosshair');
      break;
    }

    case UI.Mode.GAME_OVER: {
      show(this.gameOverElement);
      break;
    }
  }

  switch (this.entityType) {
      case UI.EntityType.METAL_MINE: {
          this.game.uniforms.gameMask.value = new THREE.Vector4(0, 1, 0, 0);
          break;
      }
      case UI.EntityType.ENERGY_MINE: {
          this.game.uniforms.gameMask.value = new THREE.Vector4(0, 0, 0, 1);
          break;
      }
      default: {
          this.game.uniforms.gameMask.value = new THREE.Vector4(1, 0, 0, 0);
      }
  }
  this.game.uniforms.needsUpdate = true;
};

UI.prototype.update = function() {
  var percent = this.game.grid.totalPeople / this.game.grid.originalTotalPeople * 100;
  percent = percent > 50 ? Math.floor(percent) : Math.ceil(percent);
  updateTextWithPulse(this.metalElement, numberWithCommas(Math.floor(this.game.metalResourceCount)));
  updateTextWithPulse(this.energyElement, numberWithCommas(Math.floor(this.game.energyResourceCount)));
  updateTextWithPulse(this.populationElement, percent + '%');

  var html = '';
  for (var i = 0; i < this.game.entities.length; i++) {
    var entity = this.game.entities[i];
    if (entity instanceof Asteroid) {
      var position = this.game.project3DtoScreen(new THREE.Vector3(0, entity.radius, 0).add(entity.mesh.position));
      if (position) {
        var dot = entity.mesh.position.clone().normalize().dot(this.game.camera.position.clone().normalize());
        var alpha = 1 - Math.max(0, Math.min(1, -1.5 * dot));
        alpha *= alpha;
        html += '<div class="health-bar" style="left:' + position.x + 'px;top:' + position.y + 'px;opacity:' + alpha.toFixed(6) + ';">' +
          '<div style="width:' + (100 * entity.health / entity.maxHealth).toFixed(2) + '%"></div></div>';
      }
    }
  }
  this.entityLayerElement.innerHTML = html;
};

UI.prototype.showHoverStats = function(unit) {
  if (unit instanceof Unit) {
    var position = this.game.project3DtoScreen(new THREE.Vector3(0, 0.05, 0).add(unit.mesh.position));
    if (position) {
      this.statsNameElement.textContent = unit.name;
      this.statsTextElement.innerHTML = unit.statsHTML();
      this.statsElement.style.left = position.x + 'px';
      this.statsElement.style.bottom = innerHeight - position.y + 'px';
      show(this.statsElement);
      return;
    }
  }
  hide(this.statsElement);
};

UI.prototype.showButtonTooltip = function(options) {
  if (options) {
    var html = options.html;
    if (options.cost && this.game.metalResourceCount < options.cost) {
      html += '<br><span style="color:red;">Cannot build, not enough metal</span>';
    }
    this.buttonTooltipName.textContent = options.name;
    this.buttonTooltipText.innerHTML = html;
    var offset = offsetOf(options.element);
    this.buttonTooltipElement.style.right = innerWidth - offset.x + 'px';
    this.buttonTooltipElement.style.top = offset.y + 'px';
    show(this.buttonTooltipElement);
  } else {
    hide(this.buttonTooltipElement);
  }
};

UI.prototype.showErrorMessage = function(text) {
  clearTimeout(this.errorTimeout);
  show(this.errorElement);
  this.errorElement.textContent = text;
  this.errorElement.style.transition = 'none';
  this.errorElement.style.opacity = 1;
  this.errorTimeout = setTimeout(function() {
    this.errorElement.style.transition = 'opacity 1s';
    this.errorElement.style.opacity = 0;
  }.bind(this), 1500);
};

UI.prototype.showWinScreen = function() {
  this.gameOverElement.textContent = 'Congratulations, you win!';
  this.switchToMode(UI.Mode.GAME_OVER);
};

UI.prototype.showLoseScreen = function() {
  this.gameOverElement.innerHTML = 'Sorry, you lose.<br>Everyone died.';
  this.switchToMode(UI.Mode.GAME_OVER);
};

////////////////////////////////////////////////////////////////////////////////

function offsetOf(element) {
  var offset = new THREE.Vector2(0, 0);
  while (element != null) {
    offset.x += element.offsetLeft;
    offset.y += element.offsetTop;
    element = element.offsetParent;
  }
  return offset;
}

function div(options) {
  var div = document.createElement('div');
  if (options.css) div.className = options.css;
  if (options.text) div.textContent = options.text;
  if (options.parent) options.parent.appendChild(div);
  return div;
}

function show(element) {
  element.style.display = 'block';
}

function hide(element) {
  element.style.display = 'none';
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function updateTextWithPulse(element, text) {
  var previous = element.textContent;
  if (previous !== text) {
    element.textContent = text;
    element.style.color = text === '0' ? 'red' : 'white';
    if (previous !== '') {
      element.classList.add('pulse');
      clearTimeout(element.timeout);
      element.timeout = setTimeout(function() {
        element.classList.remove('pulse');
      }, 0.2 * 1000);
    }
  }
  previous = text;
}
