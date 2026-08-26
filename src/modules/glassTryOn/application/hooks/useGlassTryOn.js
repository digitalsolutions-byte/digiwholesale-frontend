import { useState, useRef, useEffect, useCallback } from 'react';
import { CanvasRenderer } from '../../infrastructure/renderer/CanvasRenderer';
import { calculateScale } from '../../domain/calculations/calculateScale';
import { calculateRotation } from '../../domain/calculations/calculateRotation';
import { calculatePosition } from '../../domain/calculations/calculatePosition';
import { DEFAULT_TRYON_TRANSFORMS } from '../../config/defaults';

/**
 * useGlassTryOn.js
 * 
 * Central coordinator hook for Try-On state, calculations, and rendering lifecycle.
 */
export function useGlassTryOn({ initialGlass = null, initialFaceUrl = null } = {}) {
    const canvasRef = useRef(null);
    const rendererRef = useRef(null);
    const faceImgRef = useRef(null);
    const glassImgRef = useRef(null);

    const [selectedGlass, setSelectedGlass] = useState(initialGlass);
    const [faceSourceUrl, setFaceSourceUrl] = useState(initialFaceUrl);
    const [transforms, setTransforms] = useState(DEFAULT_TRYON_TRANSFORMS);
    const [hideGlasses, setHideGlasses] = useState(false); // For before/after comparison
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

    // Main Rendering Trigger
    const renderFrame = useCallback(() => {
        const renderer = rendererRef.current;
        if (!renderer || !canvasRef.current) return;

        const faceImg = faceImgRef.current;
        const glassImg = hideGlasses ? null : glassImgRef.current;

        const cw = renderer.width;
        const ch = renderer.height;

        // Approximate face landmarks (anchored relative to canvas center)
        const leftEye = { x: cw * 0.40, y: ch * 0.44 };
        const rightEye = { x: cw * 0.60, y: ch * 0.44 };
        const eyeDistance = Math.abs(rightEye.x - leftEye.x);

        // 1. Calculate Position
        const pos = calculatePosition(leftEye, rightEye, {
            x: transforms.offsetX,
            y: transforms.offsetY,
        });

        // 2. Calculate Scale
        const scaleData = calculateScale(
            eyeDistance,
            2.15,
            transforms.userScale,
            selectedGlass?.aspectRatio || 2.4
        );

        // 3. Calculate Rotation
        const rot = calculateRotation(leftEye, rightEye, transforms.rotationDeg);

        // 4. Render Canvas
        renderer.render(faceImg, glassImg, {
            x: pos.x,
            y: pos.y,
            width: scaleData.width,
            height: scaleData.height,
            rotation: rot.radians,
            opacity: transforms.opacity,
            shadow: transforms.showShadow,
        });
    }, [transforms, hideGlasses, selectedGlass]);

    // Load Face Image when faceSourceUrl changes
    useEffect(() => {
        if (!faceSourceUrl) {
            faceImgRef.current = null;
            renderFrame();
            return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            faceImgRef.current = img;
            renderFrame();
        };
        img.onerror = () => {
            console.error('Failed to load face image:', faceSourceUrl);
            faceImgRef.current = null;
            renderFrame();
        };
        img.src = faceSourceUrl;
    }, [faceSourceUrl, renderFrame]);

    // Load Glass Frame Image when selectedGlass changes
    useEffect(() => {
        if (!selectedGlass?.imageUrl && !selectedGlass?.svg) {
            glassImgRef.current = null;
            renderFrame();
            return;
        }

        const src = selectedGlass.imageUrl || selectedGlass.svg;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            glassImgRef.current = img;
            renderFrame();
        };
        img.onerror = () => {
            console.error('Failed to load glass frame image:', src);
            glassImgRef.current = null;
            renderFrame();
        };
        img.src = src;
    }, [selectedGlass, renderFrame]);

    // Trigger render whenever transform parameters change
    useEffect(() => {
        renderFrame();
    }, [renderFrame]);

    // Transform updates
    const updateTransform = useCallback((key, value) => {
        setTransforms((prev) => ({
            ...prev,
            [key]: typeof value === 'number' ? Number(value) : value,
        }));
    }, []);

    const resetTransforms = useCallback(() => {
        setTransforms(DEFAULT_TRYON_TRANSFORMS);
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
