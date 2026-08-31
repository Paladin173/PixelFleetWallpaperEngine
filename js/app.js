(function () {
    "use strict";

    class PixelFleetApp {
        constructor(canvas) {
            this.canvas = canvas;
            this.settings = { ...window.pixelFleetSettings };
            this.world = new window.FleetWorld(this.settings);
            this.renderer = new window.CanvasRenderer(canvas);
            this.paused = false;
            this.fpsLimit = 60;
            this.lastTime = 0;
            this.simulationAccumulator = 0;
            this.renderAccumulator = 0;
            this.frameCount = 0;
            this.resizeObserver = new ResizeObserver(() => this.resize());
            this.resizeObserver.observe(document.documentElement);
            canvas.addEventListener("dblclick", (event) => this.handleDoubleClick(event));
            this.resize();
            this.renderer.ready.then(() => requestAnimationFrame((time) => this.run(time)));
        }

        run(time) {
            const delta = this.lastTime ? Math.min(0.1, (time - this.lastTime) / 1000) : 0;
            this.lastTime = time;
            if (!this.paused) {
                this.simulationAccumulator += delta;
                this.renderAccumulator += delta;
                while (this.simulationAccumulator >= 1 / 60) {
                    this.world.update(1 / 60);
                    this.simulationAccumulator -= 1 / 60;
                }
                if (this.renderAccumulator >= 1 / this.fpsLimit) {
                    this.renderer.draw(this.world, this.settings.brightness);
                    this.frameCount += 1;
                    this.renderAccumulator %= 1 / this.fpsLimit;
                }
            }
            requestAnimationFrame((nextTime) => this.run(nextTime));
        }

        resize() {
            const width = Math.max(1, window.innerWidth);
            const height = Math.max(1, window.innerHeight);
            this.renderer.resize(width, height);
            const worldHeight = 900;
            this.world.setViewport(worldHeight * width / height, worldHeight);
        }

        applySettings(settings) {
            this.settings = { ...settings };
            this.renderer.setQuality(settings.renderQuality);
            this.renderer.resize(window.innerWidth, window.innerHeight);
            this.world.applySettings(settings);
        }

        setFpsLimit(value) {
            this.fpsLimit = Math.max(1, Math.min(240, Number(value) || 60));
            this.renderAccumulator = 0;
        }

        setPaused(paused) {
            this.paused = Boolean(paused);
            this.lastTime = 0;
            this.simulationAccumulator = 0;
            this.renderAccumulator = 0;
        }

        handleDoubleClick(event) {
            if (!this.settings.interaction) return;
            const rectangle = this.canvas.getBoundingClientRect();
            const x = (event.clientX - rectangle.left) / rectangle.width * this.world.width;
            const y = (event.clientY - rectangle.top) / rectangle.height * this.world.height;
            this.world.destroyAt(x, y, 90);
        }
    }

    window.addEventListener("load", () => {
        try {
            window.pixelFleetApp = new PixelFleetApp(document.getElementById("canvas"));
        } catch (error) {
            const element = document.getElementById("error");
            element.hidden = false;
            element.textContent = `Pixel Fleet could not start: ${error.message}`;
            throw error;
        }
    });
}());