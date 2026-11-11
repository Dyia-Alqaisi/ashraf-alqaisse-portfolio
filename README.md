# Ashraf Al Qaisse · Cardiac Portfolio

**Live:** https://dyia-alqaisi.github.io/ashraf-alqaisse-portfolio/

Single-page portfolio for **Ashraf Jamal Jamel Al Qaisse**: Head of Non-Invasive Cardiac Lab at Prince Hamza Hospital (Amman), Senior Echocardiographer and Clinical Instructor.

Concept, **"Heart + Echo"**:
- A stylised anatomical **3D heart** built entirely in code (no model files). It beats with a lub-dub rhythm at ~72 BPM and moves to a different "echo window" pose in each section.
- A synthetic **ultrasound sector** (generated speckle, sweeping scan line, depth ruler, HUD) behind the hero, plus an echo **sweep reveal** on each section heading.
- An **ECG trace** that draws itself through the career timeline, one QRS spike per milestone, and a live **BPM readout** in the nav that rises a little when you scroll fast.

No patient images or data are used anywhere; every echo and ECG visual is generated.

## Stack
- [Vite](https://vitejs.dev): dev server and build
- [Three.js](https://threejs.org): 3D heart (`MeshPhysicalMaterial`, `RoomEnvironment`), lazy-loaded after first paint
- [GSAP](https://gsap.com) + ScrollTrigger: scroll-driven motion
- [Lenis](https://lenis.darkroom.engineering): smooth scrolling
- English (LTR, default) / Arabic (RTL) toggle; `prefers-reduced-motion` gives a static heart and no sweeps

## Structure
```
src/main.js     section poses (STATES), scroll choreography, reveals
src/heart.js    3D heart geometry, materials, beat and pose rendering
src/pulse.js    shared cardiac clock + ECG waveform + lub-dub curve
src/echo.js     synthetic ultrasound sector (canvas)
src/ecg.js      nav mini ECG + career timeline ECG
src/i18n.js     Arabic translations and language toggle
public/         Ashraf_Al_Qaisse_CV.pdf (date of birth / marital status removed)
```

## Run locally
```bash
npm install
npm run dev       # http://localhost:5173/ashraf-alqaisse-portfolio/
npm run build     # production build in dist/
npm run preview   # serve the build
```

## Git workflow
- `main` is always deployable.
- New work goes on a branch from `main`: `feature/<name>`, `fix/<name>`.
- Merge back into `main` with `--no-ff` when done, then push.

```bash
git checkout main && git pull
git checkout -b feature/my-change
# ...commit...
git checkout main && git merge --no-ff feature/my-change && git push
```

## Deploy
Every push to `main` builds and publishes to GitHub Pages via `.github/workflows/deploy.yml`
(Repo → Settings → Pages → Source: **GitHub Actions**). `base` in `vite.config.js` is `/ashraf-alqaisse-portfolio/`.
