'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type HandTestStatus = 'idle' | 'loading' | 'running' | 'success' | 'error';
type GestureType = 'none' | 'swipeLeft' | 'swipeRight';

interface HandGestureCallbacks {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
}

// Local model file - download from:
// https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
const MODEL_URL = '/models/hand_landmarker.task';
const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

// Gesture detection config
const SWIPE_THRESHOLD = 0.12; // 12% of screen width
const SWIPE_VELOCITY_THRESHOLD = 0.008; // Min velocity per frame
const GESTURE_COOLDOWN = 800; // ms between gestures
const POSITION_HISTORY_SIZE = 10; // Number of frames to track

export function useHandLandmarkerTest(callbacks?: HandGestureCallbacks) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const handRef = useRef<any>(null);
    const rafRef = useRef<number | null>(null);
    const [status, setStatus] = useState<HandTestStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [handsDetected, setHandsDetected] = useState<number | null>(null);
    const [lastGesture, setLastGesture] = useState<GestureType>('none');

    // Gesture tracking refs (not state to avoid re-renders)
    const positionHistoryRef = useRef<{ x: number; timestamp: number }[]>([]);
    const lastGestureTimeRef = useRef<number>(0);
    const gestureRef = useRef<GestureType>('none');

    const cleanup = useCallback(() => {
        if (rafRef.current) {
            window.cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        if (handRef.current) {
            handRef.current.close?.();
            handRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.srcObject = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        positionHistoryRef.current = [];
        gestureRef.current = 'none';
    }, []);

    useEffect(() => cleanup, [cleanup]);

    // Detect swipe gesture from position history
    const detectSwipe = useCallback((): GestureType => {
        const history = positionHistoryRef.current;
        if (history.length < 5) return 'none';

        const now = Date.now();
        if (now - lastGestureTimeRef.current < GESTURE_COOLDOWN) {
            return 'none';
        }

        // Get recent positions (last 5 frames)
        const recent = history.slice(-5);
        const older = history.slice(0, Math.max(1, history.length - 3));

        if (recent.length < 3 || older.length < 2) return 'none';

        // Calculate average positions
        const recentAvg = recent.reduce((sum, p) => sum + p.x, 0) / recent.length;
        const olderAvg = older.reduce((sum, p) => sum + p.x, 0) / older.length;

        const delta = recentAvg - olderAvg;
        const velocity = Math.abs(delta) / recent.length;

        // Check if movement is significant enough
        if (velocity < SWIPE_VELOCITY_THRESHOLD) return 'none';

        // Determine direction
        if (delta < -SWIPE_THRESHOLD) {
            return 'swipeLeft'; // Hand moved left (next step)
        } else if (delta > SWIPE_THRESHOLD) {
            return 'swipeRight'; // Hand moved right (previous step)
        }

        return 'none';
    }, []);

    const startTest = useCallback(async () => {
        if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
            setError('Kamera vom Browser nicht unterstützt.');
            setStatus('error');
            return;
        }

        cleanup();
        setError(null);
        setHandsDetected(null);
        setLastGesture('none');
        setStatus('loading');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'user' },
                    width: { ideal: 640 },
                    height: { ideal: 640 },
                },
                audio: false,
            });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.muted = true;
                videoRef.current.playsInline = true;
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
            const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
            const handLandmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: { modelAssetPath: MODEL_URL },
                runningMode: 'VIDEO',
                numHands: 1, // Only track one hand for gestures
            });
            handRef.current = handLandmarker;
            setStatus('running');

            let lastVideoTime = -1;

            const detectLoop = () => {
                const video = videoRef.current;
                const hand = handRef.current;
                if (!video || !hand) return;

                if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
                    lastVideoTime = video.currentTime;
                    try {
                        const result = hand.detectForVideo(video, performance.now());
                        const landmarks = result?.landmarks?.[0];
                        const handsCount = result?.landmarks?.length ?? 0;

                        if (handsCount > 0) {
                            setHandsDetected(handsCount);
                            setStatus('success');

                            // Track hand position for gestures (use wrist - index 0)
                            if (landmarks && landmarks[0]) {
                                const wrist = landmarks[0];
                                const now = Date.now();

                                positionHistoryRef.current.push({
                                    x: wrist.x,
                                    timestamp: now,
                                });

                                // Keep history size limited
                                if (positionHistoryRef.current.length > POSITION_HISTORY_SIZE) {
                                    positionHistoryRef.current.shift();
                                }

                                // Detect gesture
                                const gesture = detectSwipe();
                                if (gesture !== 'none' && gesture !== gestureRef.current) {
                                    gestureRef.current = gesture;
                                    lastGestureTimeRef.current = now;
                                    setLastGesture(gesture);

                                    // Trigger callback
                                    if (gesture === 'swipeLeft' && callbacks?.onSwipeLeft) {
                                        callbacks.onSwipeLeft();
                                    } else if (
                                        gesture === 'swipeRight' &&
                                        callbacks?.onSwipeRight
                                    ) {
                                        callbacks.onSwipeRight();
                                    }

                                    // Reset gesture after delay
                                    setTimeout(() => {
                                        gestureRef.current = 'none';
                                        setLastGesture('none');
                                    }, 500);
                                }
                            }
                        } else {
                            // Reset when hand is lost
                            positionHistoryRef.current = [];
                        }
                    } catch (innerError) {
                        const message =
                            innerError instanceof Error
                                ? innerError.message
                                : 'Fehler bei der Gestenerkennung';
                        setError(message);
                        setStatus('error');
                        cleanup();
                        return;
                    }
                }

                rafRef.current = window.requestAnimationFrame(detectLoop);
            };

            rafRef.current = window.requestAnimationFrame(detectLoop);
        } catch (fetchError) {
            const message =
                fetchError instanceof Error ? fetchError.message : 'Kamerazugriff verweigert';
            setError(message);
            setStatus('error');
            cleanup();
        }
    }, [cleanup, detectSwipe, callbacks]);

    const stopTest = useCallback(() => {
        cleanup();
        setStatus('idle');
        setHandsDetected(null);
        setLastGesture('none');
        setError(null);
    }, [cleanup]);

    return {
        videoRef,
        status,
        error,
        handsDetected,
        lastGesture,
        startTest,
        stopTest,
    };
}
