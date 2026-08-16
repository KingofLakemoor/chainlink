# Cosmetics Guidelines

To make profile banners and nameplates engaging, performant, and maintainable over the long term, a client-heavy, layered approach is an ideal blueprint.

Here is an architectural breakdown and optimization strategy tailored for implementing and scaling this system cleanly:

## 1. Asset Pipeline & Format Strategy
Static and animated banners have very different performance footprints. Standardizing file types and constraints early prevents asset bloat.

- **Static Assets (WebP / SVG):** Use WebP over PNG/JPEG for raster banners (30–50% smaller file sizes at equal quality). Use SVGs for vector nameplate borders, badge overlays, and geometric frames.
- **Animated Assets (Lottie vs. CSS vs. Video):**
  - **CSS Keyframes / Sprites:** Ideal for lightweight continuous effects (e.g., shimmering borders, glow pulses, gradient shifts).
  - **dotLottie (Optimized Lottie):** Best for complex vector animations (floating particles, illustrated flair). Use `.lottie` container files instead of raw JSON to cut bundle size by up to 80%.
  - **Short WebM / MP4 (H.265/AV1):** If full-frame video banners are ever introduced, looping 3–5 second silent WebM clips with `playsinline` and `preload="none"` perform significantly better than animated GIFs or complex canvas loops.

## 2. Dynamic Text Contrast & Readability
Dynamic contrast ensures user handles and badges remain legible without forcing designers to only create dark banners.

### Approach A: Layered CSS Backdrops (Simplest & Most Reliable)
Rather than calculating color math in JavaScript for every banner in a feed, rely on CSS blend modes and subtle gradient scaffolding:

```css
.banner-overlay {
  /* Subtle bottom-to-top gradient protects text legibility */
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.75) 0%,
    rgba(0, 0, 0, 0.2) 50%,
    transparent 100%
  );
}

.username-text {
  color: #ffffff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}
```

### Approach B: Canvas-Based Color Extraction (Discord-Style Dynamic Tinting)
If nameplates adapt the text color based on the dominant banner color:
- When a user uploads/selects a banner, extract the average luminance or dominant color (either during upload processing on the client or via a tiny utility like `colorthief` / `fast-average-color`).
- Calculate the relative luminance using WCAG standards ($L = 0.2126R + 0.7152G + 0.0722B$).
- Store a precomputed `textColor: "dark" | "light"` or a suggested hex value in the user's banner metadata object so the client doesn't need to re-calculate it during render cycles.

## 3. Client Performance & Low-Power Optimization
When rendering leaderboards, league tables, or member rosters, multiple animated banners on-screen simultaneously can cause layout thrashing and high GPU utilization.

### A. Intersection Observer for Off-Screen Pausing
Never animate banners that aren't visible in the active viewport:

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const animation = entry.target.querySelector('.animated-banner');
    if (animation) {
      if (entry.isIntersecting) {
        animation.play(); // or add CSS animation class
      } else {
        animation.pause(); // or remove CSS animation class
      }
    }
  });
}, { threshold: 0.1 });
```

### B. Honoring Accessibility & Battery Constraints
Respect system preferences and low-power modes using standard media queries:

```css
@media (prefers-reduced-motion: reduce) {
  .animated-banner,
  .lottie-container {
    animation: none !important;
    display: none; /* Fallback to a static poster image */
  }
  .static-poster {
    display: block;
  }
}
```

## 4. Metadata Schema & Asset Serving
To keep bandwidth low and updates sustainable, decouple asset storage from application code.

**Recommended Banner Data Model:**
```typescript
interface UserBannerProfile {
  bannerId: string;
  type: "static" | "animated" | "preset";
  assetUrl: string;       // WebP or SVG URL
  animatedUrl?: string;   // dotLottie JSON or WebM URL (optional)
  fallbackColor?: string; // Hex color shown while loading
  theme: {
    textColor: "#ffffff" | "#000000";
    accentColor?: string;
  };
}
```

**CDN & Caching Strategy:**
- Serve banner assets via a CDN with aggressive caching (`Cache-Control: public, max-age=31536000, immutable`).
- Use content-hashed filenames (e.g., `banner_v1_8f93a.webp`) so client browsers never fetch duplicate assets when navigating between views.

## 5. Gamification & Feature Sustainability
To ensure the feature adds recurring excitement across league seasons:
- **Achievement / Milestone Nameplates:** Unlock exclusive borders or banners based on season placement, win streaks, or participation badges.
- **Tiered Cosmetics:** Keep a catalogue of standard theme colors/presets available to all users, reserving animated or intricate nameplates for season champions or milestone unlocks.
- **Modular Frames:** Design nameplate frames with a standard aspect ratio (e.g., 4:1 or 3:1) and standardized avatar cutouts so new art drops can reuse existing CSS layout templates without custom adjustments.
