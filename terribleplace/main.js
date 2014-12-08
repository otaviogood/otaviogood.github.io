document.addEventListener("DOMContentLoaded", function () {

    var scene, camera, clock, uniforms, directionalLight;
    var time = 0.0;
    var delta = 0.0;
    var sphere;
    var game;
    var ui;
    var gameRenderer;
    var glRenderer;
    var mousePressed = false;

    function init() {
        audioEffect01 = new Audio("sounds/effect01.wav");
        audioEffect02 = new Audio("sounds/effect02.wav");
        audioEffect03 = new Audio("sounds/effect03.wav");
        audioEffect04 = new Audio("sounds/effect04.wav");
        audioEffect05 = new Audio("sounds/effect05.wav");
        audioEffect06 = new Audio("sounds/effect06.wav");
        audioEffect07 = new Audio("sounds/effect07.wav");
        audioEffect08 = new Audio("sounds/effect08.wav");
        audioOutOfMetal = new Audio("sounds/effect01.wav");
        audioOutOfEnergy = new Audio("sounds/OutOfEnergy1.wav");
        audioExplosion = new Audio("sounds/explosion1.wav");
        //audioOutOfEnergy.play();
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        glRenderer = new THREE.WebGLRenderer(); glRenderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(glRenderer.domElement);



        uniforms = {

            fogDensity: { type: "f", value: 0.45 },
            fogColor: { type: "v3", value: new THREE.Vector3(0, 0, 0) },
            time: { type: "f", value: 1.0 },
            resolution: { type: "v2", value: new THREE.Vector2() },
            uvScale: { type: "v2", value: new THREE.Vector2(3.0, 1.0) },
            texture1: { type: "t", value: null },
            gameTexture: { type: "t", value: null },
            selectedFace: { type: "v2", value: new THREE.Vector2(13.0, 11.0) },
            gridPos: { type: "v3", value: new THREE.Vector3(13.0, 11.0, 1.0) },
            gridDims: { type: "v2", value: new THREE.Vector2(64.0, 32.0) },
            gameMask: { type: "v4", value: new THREE.Vector4(1.0, 0.0, 0.0, 0.0) },
            lightVec: { type: "v3", value: new THREE.Vector3(1.0, 1.0, 1.0) },
        };

        //uniforms.texture1.value.wrapS = uniforms.texture1.value.wrapT = THREE.RepeatWrapping;
        //uniforms.gameTexture.value.wrapS = uniforms.gameTexture.value.wrapT = THREE.RepeatWrapping;

        var material = new THREE.ShaderMaterial({

            uniforms: uniforms,
            vertexShader: document.getElementById('vertexShader').textContent,
            fragmentShader: document.getElementById('fragmentShader').textContent

        });

        var geometry = new THREE.SphereGeometry(1, 64, 32);
        //var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        //var material = new THREE.MeshNormalMaterial();
        sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);

        directionalLight = new THREE.DirectionalLight(0xffffff);
        directionalLight.position.set(0, -70, 100).normalize();
        scene.add(directionalLight);

        var ambientLight = new THREE.AmbientLight(0x303020);
        scene.add(ambientLight);

        game = new Game({
            width: 64,
            height: 32,
            scene: scene,
            camera: camera,
            uniforms: uniforms,
            intersectWorld: function(x, y) {
                return intersectObject(x, y, sphere);
            },
            intersectScene: function(x, y) {
                return intersectObject(x, y, scene);
            },
        });
        ui = new UI(game);

        document.body.appendChild(ui.element);
        gameRenderer = new GameRenderer(game);

        gameRenderer.genWorld(glRenderer);

        game.grid.seedRandomValues(gameRenderer.getWorldMask());

        window.addEventListener('resize', onWindowResize, false);
        clock = new THREE.Clock();
    }

    function onWindowResize() {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        var scale = window.devicePixelRatio || 1;
        glRenderer.setSize(window.innerWidth * scale, window.innerHeight * scale);

        //controls.handleResize();

        render();

    }

    function render() {
        requestAnimationFrame(animate);
        gameRenderer.updateTextures();

        directionalLight.position.set(camera.position.x + camera.position.z * 0.5, camera.position.y + 2.0, camera.position.z - camera.position.x * 0.5).normalize();
        //directionalLight.needsUpdate = true;

        uniforms.lightVec.value = new THREE.Vector3(directionalLight.position.x, directionalLight.position.y, directionalLight.position.z);
        uniforms.texture1.value = gameRenderer.getWorldTexture();
        uniforms.gameTexture.value = gameRenderer.getGameTexture();
        uniforms.needsUpdate = true;

        glRenderer.render(scene, camera);
    }

    function animate() {
        var deltaSeconds = clock.getDelta();

        game.update(deltaSeconds);
        ui.update();

        //requestAnimationFrame(animate);
        //  controls.update();
        render();
    }

    function intersectObject(mouseX, mouseY, object) {
        mouseX = (mouseX / window.innerWidth) * 2 - 1;
        mouseY = -(mouseY / window.innerHeight) * 2 + 1;
        var projPos = new THREE.Vector3(mouseX, mouseY, 0.0);
        projPos.unproject(camera)
        var rayDir = new THREE.Vector3();
        rayDir.copy(projPos)
        rayDir.sub(camera.position)
        rayDir.normalize()
        var raycaster = new THREE.Raycaster(camera.position, rayDir);
        return raycaster.intersectObject(object, true);
    }

    init();
    animate();
});
