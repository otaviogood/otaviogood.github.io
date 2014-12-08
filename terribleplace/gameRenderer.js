
function GameRenderer(game) {
  this._gameTexture = null;
  this._gameTextureLin = null;
  this._game = game;
  this._worldRt = new THREE.WebGLRenderTarget(2048, 1024, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
  this._gameRt = new THREE.WebGLRenderTarget(64, 32, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat });
  this._worldMask = new self.Uint8Array(64 * 32 * 4);
}

GameRenderer.prototype.updateTextures = function() {
	var game = this._game;
	var size = game.grid.width * game.grid.height;
	var gameData = new Uint8Array(game.grid.width * game.grid.height * 4);
	for (var i = 0; i < game.grid.cells.length; i++) {
		var cell = game.grid.cells[i];
		gameData[i * 4 + 0] = Math.min(cell.people / 1000000, 255);
		gameData[i * 4 + 1] = Math.min(cell.metal * 255, 255);
		gameData[i * 4 + 2] = (cell.units.length == 0 && !cell.water) ? 255 : 0;
		gameData[i * 4 + 3] = Math.min(cell.energy * 255, 255);;
	}
	// TODO double buffer
	if (this._gameTexture != null) {
	    this._gameTexture.dispose();
	}
	this._gameTexture = new THREE.DataTexture(gameData, game.grid.width, game.grid.height, THREE.RGBAFormat);
	this._gameTexture.minFilter = THREE.NearestFilter;
	this._gameTexture.magFilter = THREE.NearestFilter;
	this._gameTexture.needsUpdate = true;
    this._gameTextureLin = new THREE.DataTexture(gameData, game.grid.width, game.grid.height, THREE.RGBAFormat);
    this._gameTextureLin.minFilter = THREE.LinearFilter;
    this._gameTextureLin.magFilter = THREE.LinearFilter;
    this._gameTextureLin.needsUpdate = true;
};

GameRenderer.prototype.getGameTexture = function() {
	return this._gameTexture;
};

GameRenderer.prototype.getGameTextureLinear = function() {
    return this._gameTextureLin;
};

GameRenderer.prototype.getWorldTexture = function () {
    return this._worldRt;
};

GameRenderer.prototype.getWorldMaskTexture = function() {
	return this._gameRt;
};

GameRenderer.prototype.getWorldMask = function() {
    return this._worldMask;
}

GameRenderer.prototype.genWorld = function (renderer) {

    // scene
    var scene = new THREE.Scene();

    // camera
    var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 1000);
    camera.position.set(0, 0, 1);
    camera.updateProjectionMatrix()

    // uniforms
    var uniforms = {
        color: { type: "c", value: new THREE.Color(0xaaaadd) },
        iResolution: { type: "v3", value: new THREE.Vector3(500.0, 400.0, 0.0) },
        iGlobalTime: { type: "f", value: 1.0 },
        spiralyness: { type: "f", value: 1.0 },
        bulgeSize: { type: "f", value: 1.0 },
        squish: { type: "f", value: 1.0 },
        iMouse: { type: "v4", value: new THREE.Vector4(5.0, 40.0, 0.0, 0.0) },
        writeWaterMask: { type: "f", value: 0.0 },
        randomSeed: { type: "f", value: Math.random()*100.0 },
    };

    // attributes
    var attributes = {
    };

    // material
    var material = new THREE.ShaderMaterial({
        attributes: attributes,
        uniforms: uniforms,
        vertexShader: document.getElementById('worldVS').textContent,
        fragmentShader: document.getElementById('worldFS').textContent
    });

    // plane geometry
    var geometry = new THREE.PlaneGeometry(2, 2);

    // plane
    var mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    renderer.render(scene, camera, this._worldRt, true);

    uniforms.writeWaterMask.value = 1.0;
    uniforms.needsUpdate = true;
    renderer.render(scene, camera, this._gameRt, true);

    var gl = renderer.context;
	gl.bindFramebuffer(gl.FRAMEBUFFER, this._gameRt.__webglFramebuffer);
	gl.readPixels(0, 0, 64, 32, gl.RGBA, gl.UNSIGNED_BYTE, this._worldMask);
};