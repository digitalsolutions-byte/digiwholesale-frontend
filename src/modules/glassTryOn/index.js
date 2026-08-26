/**
 * src/modules/glassTryOn/index.js
 * 
 * Public API Boundary for the Virtual Glass Try-On Module.
 * External applications and host shells should ONLY import from this file.
 */

export { default as GlassTryOnPage } from './ui/pages/GlassTryOnPage';
export * from './config/featureConfig';
export * from './config/defaults';
export * from './constants';
export * from './domain/calculations/calculateScale';
export * from './domain/calculations/calculateRotation';
export * from './domain/calculations/calculatePosition';
export * from './domain/validation/validateGlass';
export * from './domain/entities/Glass';
export * from './domain/entities/Face';
export * from './infrastructure/renderer/RendererInterface';
export * from './infrastructure/renderer/CanvasRenderer';
export * from './infrastructure/api/createGlassTryOnApi';
export * from './application/hooks/useGlassTryOn';
export * from './application/hooks/useCamera';
