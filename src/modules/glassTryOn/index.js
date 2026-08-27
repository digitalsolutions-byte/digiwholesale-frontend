/**
 * src/modules/glassTryOn/index.js
 * 
 * Public API Boundary for the Virtual Glass Try-On Module.
 * External applications and host shells should ONLY import from this file.
 */

export { default as GlassTryOnPage } from './ui/pages/GlassTryOnPage';
export { default as FaceShapeBadge } from './ui/components/FaceShapeBadge';
export * from './config/featureConfig';
export * from './config/defaults';
export * from './constants';
export * from './domain/calculations/calculateScale';
export * from './domain/calculations/calculateRotation';
export * from './domain/calculations/calculatePosition';
export * from './domain/calculations/calculatePose25D';
export * from './domain/calculations/selectAngleImage';
export * from './domain/calculations/detectFaceShape';
export * from './domain/calculations/landmarkMap';
export * from './domain/calculations/temporalSmoothing';
export * from './domain/validation/validateGlass';
export * from './domain/entities/Glass';
export * from './domain/entities/Face';
export * from './infrastructure/renderer/RendererInterface';
export * from './infrastructure/renderer/CanvasRenderer';
export * from './infrastructure/detector/FaceLandmarkDetector';
export * from './infrastructure/image/removeBackground';
export * from './infrastructure/api/createGlassTryOnApi';
export * from './application/hooks/useGlassTryOn';
export * from './application/hooks/useCamera';
