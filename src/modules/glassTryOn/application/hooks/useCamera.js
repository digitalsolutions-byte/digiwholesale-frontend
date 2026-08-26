import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * useCamera.js
 * 
 * Manages webcam access, live video streaming, snapshot capture, and error states.
 */
export function useCamera() {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [facingMode, setFacingMode] = useState('user'); // 'user' or 'environment'

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsStreaming(false);
        setCameraError(null);
    }, []);

    const startCamera = useCallback(async (mode = facingMode) => {
        stopCamera();
        setCameraError(null);

        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API is not supported in this browser.');
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: mode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setIsStreaming(true);
            setFacingMode(mode);
        } catch (err) {
            console.error('Webcam access error:', err);
            let message = 'Unable to access camera. Please check browser permissions.';
            if (err.name === 'NotAllowedError') {
                message = 'Camera permission denied. Please allow camera access in browser settings.';
            } else if (err.name === 'NotFoundError') {
                message = 'No camera found on this device.';
            }
            setCameraError(message);
            setIsStreaming(false);
        }
    }, [facingMode, stopCamera]);

    const captureSnapshot = useCallback(() => {
        if (!videoRef.current || !isStreaming) return null;

        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/png');
    }, [isStreaming]);

    // Clean up camera stream on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    return {
        videoRef,
        isStreaming,
        cameraError,
        facingMode,
        startCamera,
        stopCamera,
        captureSnapshot,
    };
}
