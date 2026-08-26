/**
 * RendererInterface.js
 * 
 * Abstract interface for Virtual Try-On renderers (Canvas 2D, WebGL, Three.js).
 * Ensures the UI layer never couples directly to a specific rendering engine.
 */

export class RendererInterface {
    initialize() {
        throw new Error('initialize() must be implemented by concrete renderer.');
    }

    render() {
        throw new Error('render() must be implemented by concrete renderer.');
    }

    clear() {
        throw new Error('clear() must be implemented by concrete renderer.');
    }

    destroy() {
        throw new Error('destroy() must be implemented by concrete renderer.');
    }
}
