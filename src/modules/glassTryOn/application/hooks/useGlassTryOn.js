import { useState, useRef, useEffect, useCallback } from 'react';
import { CanvasRenderer } from '../../infrastructure/renderer/CanvasRenderer';
import { FaceLandmarkDetector } from '../../infrastructure/detector/FaceLandmarkDetector';
import { removeBackground } from '../../infrastructure/image/removeBackground';
import { calculateScale } from '../../domain/calculations/calculateScale';
import { calculatePose25D } from '../../domain/calculations/calculatePose25D';
import { detectFaceShape } from '../../domain/calculations/detectFaceShape';
import { TemporalSmoothingFilter } from '../../domain/calculations/temporalSmoothing';
import { DEFAULT_TRYON_TRANSFORMS } from '../../config/defaults';

/**
 * useGlassTryOn.js
 * 
 * Central coordinator with:
 * - Google MediaPipe Face Landmarker AI (478 3D Landmarks)
 * - Continuous Rolling Biometric Buffer for Rock-Solid Face Shape Classification
 * - Realistic 3D Side Supports (Temples, Hinges, and Ear Hooks)
 * - Automatic In-Browser Background Removal & Alpha Isolation
 * - Multi-Angle 3D Sprite Selection (Yaw-Responsive Angle Switching)
 * - Live 60 FPS Video Tracking Loop
 */
export function useGlassTryOn({ initialGlass = null, initialFaceUrl = null } = {}) {
    const canvasRef = useRef(null);
    const rendererRef = useRef(null);
    const detectorRef = useRef(new FaceLandmarkDetector());
    const filterRef = useRef(new TemporalSmoothingFilter({ alpha: 0.55, angleAlpha: 0.45 }));
    const shapeBufferRef = useRef([]); // Rolling buffer for stable continuous face shape detection

    const faceImgRef = useRef(null);
    const landmarksRef = useRef(null);
    const loadedAnglesRef = useRef({
        front: null,
        left: null,
        right: null,
    });

    const [selectedGlass, setSelectedGlass] = useState(initialGlass);
    const [faceSourceUrl, setFaceSourceUrl] = useState(initialFaceUrl);
    const [transforms, setTransforms] = useState(DEFAULT_TRYON_TRANSFORMS);
    const [hideGlasses, setHideGlasses] = useState(false);
    const [showFaceMesh, setShowFaceMesh] = useState(false);
    const [faceShapeInfo, setFaceShapeInfo] = useState(null);
    const [poseInfo, setPoseInfo] = useState({ yawDeg: 0, pitchDeg: 0, rollDeg: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0, initialOffsetX: 0, initialOffsetY: 0 });

    // Initialize renderer once canvas mounts
    useEffect(() => {
        if (canvasRef.current) {
            const renderer = new CanvasRenderer();
            renderer.initialize(canvasRef.current, { width: 640, height: 520 });
            rendererRef.current = renderer;
        }

        return () => {
            if (rendererRef.current) {
                rendererRef.current.destroy();
                rendererRef.current = null;
            }
        };
    }, []);

    // Main 2.5D/3D Rendering Trigger
    const renderFrame = useCallback(() => {
        const renderer = rendererRef.current;
        if (!renderer || !canvasRef.current) return;

        const faceImg = faceImgRef.current;
        const rawLandmarks = landmarksRef.current;

        const cw = renderer.width;

        // 1. Calculate 2.5D/3D Pose & Anatomical Anchors
        const pose = calculatePose25D(rawLandmarks, {
            offsetX: transforms.offsetX,
            offsetY: transforms.offsetY,
            rotationDeg: transforms.rotationDeg,
        });

        // 2. Calculate Scale from Anatomical IPD / Eye Distance
        const eyeDistance = pose.eyeDistance || (cw * 0.22);
        const scaleData = calculateScale(
            eyeDistance,
            2.18, // Optical standard ratio: 138mm frame / 63mm IPD
            transforms.userScale,
            selectedGlass?.aspectRatio || 2.4
        );

        // 3. Smooth Pose Coordinates to eliminate frame jitter
        const smoothed = filterRef.current.filter({
            ...pose,
            width: scaleData.width,
            height: scaleData.height,
        });

        setPoseInfo({
            yawDeg: pose.yawDeg,
            pitchDeg: pose.pitchDeg,
            rollDeg: pose.rollDeg,
        });

        // 4. Render 2.5D Glasses Assembly (Front Frame + Left/Right Temple Arms)
        const activeGlassAssets = hideGlasses ? null : loadedAnglesRef.current;

        renderer.render(faceImg, activeGlassAssets, {
            x: smoothed.anchorX,
            y: smoothed.anchorY,
            width: smoothed.width,
            height: smoothed.height,
            rotation: smoothed.rollRad,
            yaw: smoothed.yawRad,
            yawDeg: smoothed.yawDeg,
            pitch: smoothed.pitchRad,
            leftEar: smoothed.leftEar,
            rightEar: smoothed.rightEar,
            opacity: transforms.opacity,
            landmarks: rawLandmarks,
            showFaceMesh,
        });
    }, [transforms, hideGlasses, selectedGlass, showFaceMesh]);

    // Preload & Background-Strip all angles for selectedGlass
    useEffect(() => {
        if (!selectedGlass) {
            loadedAnglesRef.current = { front: null, left: null, right: null };
            renderFrame();
            return;
        }

        const multi = selectedGlass.images || selectedGlass.angles;
        const frontSrc = multi?.front || selectedGlass.imageUrl || selectedGlass.svg;
        const leftSrc = (multi?.left && multi.left !== frontSrc) ? multi.left : null;
        const rightSrc = (multi?.right && multi.right !== frontSrc) ? multi.right : null;

        const loadSingle = (src) => {
            return new Promise((resolve) => {
                if (!src) return resolve(null);
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    const processed = removeBackground(img, { threshold: 34, feather: 20 });
                    resolve(processed || img);
                };
                img.onerror = () => resolve(null);
                img.src = src;
            });
        };

        let isCancelled = false;

        Promise.all([
            loadSingle(frontSrc),
            loadSingle(leftSrc),
            loadSingle(rightSrc),
        ]).then(([frontCanvas, leftCanvas, rightCanvas]) => {
            if (isCancelled) return;
            loadedAnglesRef.current = {
                front: frontCanvas,
                left: leftCanvas || null,
                right: rightCanvas || null,
            };
            renderFrame();
        });

        return () => {
            isCancelled = true;
        };
    }, [selectedGlass, renderFrame]);

    // Continuous rolling buffer face shape detection
    const updateFaceShapeWithBuffer = useCallback((landmarks) => {
        if (!landmarks) return;

        const shapeResult = detectFaceShape(landmarks);
        if (!shapeResult) return;

        // Keep rolling buffer of last 10 detections
        const buf = shapeBufferRef.current;
        buf.push(shapeResult);
        if (buf.length > 10) buf.shift();

        // Frequency count most dominant shape in buffer
        const counts = {};
        buf.forEach((s) => {
            counts[s.shape] = (counts[s.shape] || 0) + 1;
        });

        let dominantShape = shapeResult.shape;
        let maxCount = 0;
        Object.keys(counts).forEach((shp) => {
            if (counts[shp] > maxCount) {
                maxCount = counts[shp];
                dominantShape = shp;
            }
        });

        // Set stable face shape
        const finalProfile = buf.find((s) => s.shape === dominantShape) || shapeResult;
        setFaceShapeInfo(finalProfile);
    }, []);

    // Detect landmarks & classify face shape for static images
    const processFaceMedia = useCallback(async (imgElement) => {
        if (!imgElement || !detectorRef.current) return;

        const cw = rendererRef.current?.width || 640;
        const ch = rendererRef.current?.height || 520;

        const detection = await detectorRef.current.detectImage(imgElement, cw, ch);
        if (detection?.landmarks) {
            landmarksRef.current = detection.landmarks;
            shapeBufferRef.current = []; // Reset buffer for new photo
            updateFaceShapeWithBuffer(detection.landmarks);
        } else {
            landmarksRef.current = null;
        }

        renderFrame();
    }, [renderFrame, updateFaceShapeWithBuffer]);

    // Process live video frame directly from webcam feed (Real-Time 60 FPS)
    const processLiveVideoFrame = useCallback((videoElement) => {
        if (!videoElement || !detectorRef.current || videoElement.readyState < 2) return;

        faceImgRef.current = videoElement;
        const cw = rendererRef.current?.width || 640;
        const ch = rendererRef.current?.height || 520;

        const detection = detectorRef.current.detectVideo(videoElement, cw, ch);
        if (detection?.landmarks) {
            landmarksRef.current = detection.landmarks;
            // Update rolling face shape buffer continuously
            updateFaceShapeWithBuffer(detection.landmarks);
        }

        renderFrame();
    }, [renderFrame, updateFaceShapeWithBuffer]);

    // Load Face Image when faceSourceUrl changes
    useEffect(() => {
        if (!faceSourceUrl) {
            faceImgRef.current = null;
            landmarksRef.current = null;
            filterRef.current.reset();
            shapeBufferRef.current = [];
            renderFrame();
            return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            faceImgRef.current = img;
            processFaceMedia(img);
        };
        img.onerror = () => {
            console.error('Failed to load face image:', faceSourceUrl);
            faceImgRef.current = null;
            landmarksRef.current = null;
            renderFrame();
        };
        img.src = faceSourceUrl;
    }, [faceSourceUrl, processFaceMedia, renderFrame]);

    // Trigger render whenever transform parameters change
    useEffect(() => {
        renderFrame();
    }, [renderFrame]);

    // Transform updates
    const updateTransform = useCallback((key, value) => {
        setTransforms((prev) => {
            let parsedVal = value;
            if (['userScale', 'offsetY', 'offsetX', 'rotationDeg', 'opacity'].includes(key)) {
                parsedVal = Number(value);
                if (isNaN(parsedVal)) {
                    parsedVal = prev[key] || 0;
                }
            }
            return {
                ...prev,
                [key]: parsedVal,
            };
        });
    }, []);

    const resetTransforms = useCallback(() => {
        setTransforms(DEFAULT_TRYON_TRANSFORMS);
        filterRef.current.reset();
    }, []);

    // Drag-to-position handlers on Canvas
    const handleMouseDown = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            initialOffsetX: transforms.offsetX,
            initialOffsetY: transforms.offsetY,
        };
    }, [transforms.offsetX, transforms.offsetY]);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        const dx = currentX - dragStartRef.current.x;
        const dy = currentY - dragStartRef.current.y;

        setTransforms((prev) => ({
            ...prev,
            offsetX: Math.max(-100, Math.min(100, Math.round(dragStartRef.current.initialOffsetX + dx))),
            offsetY: Math.max(-100, Math.min(100, Math.round(dragStartRef.current.initialOffsetY + dy))),
        }));
    }, [isDragging]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Wheel-to-zoom
    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.03 : 0.03;
        setTransforms((prev) => ({
            ...prev,
            userScale: Math.max(0.65, Math.min(1.45, Number((prev.userScale + delta).toFixed(2)))),
        }));
    }, []);

    // Export snapshot
    const getSnapshotDataUrl = useCallback(() => {
        if (!rendererRef.current) return null;
        return rendererRef.current.toDataURL('image/png', 0.95);
    }, []);

    return {
        canvasRef,
        selectedGlass,
        setSelectedGlass,
        faceSourceUrl,
        setFaceSourceUrl,
        transforms,
        updateTransform,
        resetTransforms,
        hideGlasses,
        setHideGlasses,
        showFaceMesh,
        setShowFaceMesh,
        faceShapeInfo,
        poseInfo,
        processLiveVideoFrame,
        getSnapshotDataUrl,
        canvasEvents: {
            onMouseDown: handleMouseDown,
            onMouseMove: handleMouseMove,
            onMouseUp: handleMouseUp,
            onMouseLeave: handleMouseUp,
            onWheel: handleWheel,
        },
        isDragging,
    };
}
