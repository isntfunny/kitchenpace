# Hand Gesture Control - Technical Demonstration

**Status:** Technical Demo Complete  
**Component:** Recipe Mobile Viewer (`@src/components/flow/viewer/MobileView.tsx`)  
**Technology:** MediaPipe Hand Landmarker + Floating UI

---

## What Was Implemented

### 1. Core Hand Detection (`useHandLandmarkerTest.ts`)

- ✅ Local model loading (`/models/hand_landmarker.task`)
- ✅ Front camera access with `getUserMedia`
- ✅ Real-time hand landmark detection (21 keypoints)
- ✅ Hand tracking with 30fps detection loop
- ✅ Video preview overlay

### 2. Gesture Recognition

- ✅ **Swipe Left** → Navigate to next recipe step (`goRight`)
- ✅ **Swipe Right** → Navigate to previous recipe step (`goLeft`)
- ✅ Velocity-based detection (0.8% screen width per frame threshold)
- ✅ Cooldown mechanism (800ms between gestures)
- ✅ Position history tracking (10 frames)

### 3. UI Integration

- ✅ "Handsteuerung testen" panel in MobileView
- ✅ Start/Stop camera controls
- ✅ Status messages with gesture feedback
- ✅ Visual gesture hints (← Zurück | Weiter →)
- ✅ Color-coded status (Green = gesture detected)

### 4. Smart Placement (Bonus)

- ✅ Floating UI integration for OnboardJS overlays
- ✅ Auto-placement middleware (flip, shift, autoPlacement)
- ✅ Dynamic arrow positioning based on panel placement
- ✅ Responsive spotlight positioning

---

## Known Limitations

1. **HTTPS Required**
    - Camera permissions only work on secure contexts
    - Use ngrok/localtunnel for mobile device testing

2. **Single Hand Tracking**
    - Currently tracks only one hand for gestures
    - Could be extended to two-hand gestures

3. **Swipe Detection Sensitivity**
    - May need tuning for different hand sizes/distances
    - Currently optimized for medium distance (~arm's length)

4. **Performance**
    - Running detection loop on main thread
    - Could be offloaded to Web Worker for better performance

5. **Gesture Set**
    - Only horizontal swipes implemented
    - Vertical gestures (up/down for branches) not yet added

---

## What's Still To Do

### Phase 2: Enhanced Gestures (MVP)

- [ ] **Vertical Swipes**
    - Swipe Up → Navigate to upper parallel branch
    - Swipe Down → Navigate to lower parallel branch
- [ ] **Open Palm Detection**
    - Open palm = "Mark step as done"
    - Fist = "Pause/Resume timer"

- [ ] **Pinch Gesture**
    - Pinch in/out for zoom on flow diagram

### Phase 3: UX Improvements

- [ ] **Skeleton Overlay**
    - Draw hand skeleton on video preview
    - Visual feedback for tracking quality

- [ ] **Gesture Tutorial**
    - First-time user guide for gestures
    - Practice mode with visual indicators

- [ ] **Settings Panel**
    - Adjust sensitivity thresholds
    - Toggle gesture types
    - Calibration for hand size

### Phase 4: Production Readiness

- [ ] **Error Recovery**
    - Better error messages
    - Retry mechanisms for camera access
    - Fallback to touch-only mode

- [ ] **Performance Optimization**
    - Web Worker for detection
    - FPS throttling options
    - Battery-aware mode

- [ ] **Accessibility**
    - Alternative input methods
    - Voice commands integration
    - Screen reader support

- [ ] **Multi-language Support**
    - German gesture names
    - Localized feedback messages

---

## Testing Instructions

### Local Development

```bash
# Start dev server
npm run dev

# For mobile testing, use ngrok
ngrok http 3000
```

### Mobile Device Setup

1. Start ngrok and get HTTPS URL
2. Open URL on phone browser
3. Click "Handsteuerung testen"
4. Grant camera permissions
5. Hold hand ~30cm from camera
6. Swipe left/right to navigate

### Expected Behavior

- Hand detected: Status turns green
- Swipe left: "⬅️ Swipe erkannt: Weiter" + advances step
- Swipe right: "➡️ Swipe erkannt: Zurück" + goes back
- 800ms cooldown between gestures

---

## Technical Architecture

```
MobileView.tsx
├── useMobileNavigation()    ← Touch navigation (existing)
├── useHandLandmarkerTest()  ← New gesture control
│   ├── MediaPipe Hand Landmarker
│   ├── Position tracking
│   └── Gesture detection
└── Floating UI (OnboardJS)  ← Smart overlay placement
```

### Key Files

- `src/components/flow/viewer/useHandLandmarkerTest.ts` - Core hook
- `src/components/flow/viewer/MobileView.tsx` - UI integration
- `src/components/recipe/RecipeForm.tsx` - Smart overlay demo
- `public/models/hand_landmarker.task` - ML model (4.5MB)

---

## Next Steps Recommendation

1. **Test on real devices** - Gather feedback on gesture sensitivity
2. **Add vertical swipes** - Complete navigation gesture set
3. **Polish UI** - Add hand skeleton overlay
4. **Performance test** - Measure FPS impact on low-end devices
5. **User study** - Test with actual cooks in kitchen environment

---

**Demo Video:** Record a short clip showing hand gestures navigating through a recipe  
**Created:** 2025-03-12  
**Tech Stack:** React 18, MediaPipe, Floating UI, TypeScript
