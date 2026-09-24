# Interactive 3D Globe

A full-viewport interactive 3D globe built with Three.js featuring:

- **Rotating Earth** with high-quality blue-marble texture and subtle bump mapping
- **Glowing location markers** with soft point lights and pulsing animation
- **Drag-to-spin** via OrbitControls with damping
- **Click-to-focus** on any marker with smooth camera transitions
- **Featured locations list** in a glassmorphic sidebar
- **Soft ambient + directional lighting**
- **Auto-rotate** that automatically pauses while the user interacts and resumes after a short delay
- **Subtle atmosphere** (Fresnel-style glow + outer haze)
- Fully responsive (sidebar becomes a bottom strip on mobile)

## Featured Locations

New York · London · Tokyo · Sydney · Rio de Janeiro · Cape Town · Dubai · Singapore · Paris · San Francisco

## Running locally

This is a static site. Just open `index.html` in a modern browser, or serve the folder:

```bash
npx serve .
# or
python -m http.server 8000
```

No build step required — Three.js is loaded via CDN + import maps.

## Tech

- [Three.js](https://threejs.org/) r170
- OrbitControls
- Custom atmosphere shader
- Pure HTML / CSS / ES modules

## License

MIT
