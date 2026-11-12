// Cigarette "brands": how the stick looks, how its pack is printed, and what one costs your lungs.
// tar / nic / co are mg per cigarette, rough label-style figures, used by the stats tar calculator.
// Colours are linear-ish 0..1 for the shader; pack colours are CSS.

const C = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

export const BRANDS = [
  {
    id: 'classic', name: 'Classic Gold', short: 'Classic', blurb: 'Cork tip, twin gold rings.',
    tar: 10, nic: 0.8, co: 10,
    look: {
      paper: [0.90, 0.89, 0.86], tipA: [0.74, 0.46, 0.20], tipB: [0.92, 0.72, 0.40], cork: 1,
      band: [1.0, 0.76, 0.33], bandMetal: 1, bands: [1, 1], filter: [0.90, 0.88, 0.83], charcoal: 0,
      stars: 0, print: [0, 0, 0], tobacco: [1, 1, 1],
    },
    pack: { bg: '#f4efe4', ink: '#141414', accent: '#c9a046', accent2: '#8d1d1d', style: 'roof' },
  },
  {
    id: 'menthol', name: 'Menthol Pop', short: 'Menthol', blurb: 'Click the capsule for an icy hit.',
    tar: 8, nic: 0.6, co: 8, capsule: true, mint: [0.55, 0.95, 0.82],
    look: {
      paper: [0.93, 0.94, 0.93], tipA: [0.93, 0.95, 0.94], tipB: [0.97, 0.98, 0.97], cork: 0.15,
      band: [0.25, 0.78, 0.62], bandMetal: 0.25, bands: [1, 0], filter: [0.93, 0.94, 0.92], charcoal: 0,
      stars: 0, print: [0, 0, 0], tobacco: [1, 1, 1],
    },
    pack: { bg: '#0f8a73', bg2: '#5fd6b8', ink: '#ffffff', accent: '#d8fff4', accent2: '#0a4d42', style: 'wave' },
  },
  {
    id: 'sevenstars', name: 'Seven Stars', short: '7 Stars', blurb: 'Charcoal filter, a ring of seven stars.',
    tar: 14, nic: 1.2, co: 13,
    look: {
      paper: [0.95, 0.95, 0.94], tipA: [0.95, 0.95, 0.95], tipB: [0.98, 0.98, 0.98], cork: 0.1,
      band: C('#7f8fa8'), bandMetal: 1, bands: [0, 1], filter: [0.86, 0.86, 0.85], charcoal: 1,
      stars: 1, print: C('#1c2f66'), tobacco: [1, 1, 1],
    },
    pack: { bg: '#1a2a5c', bg2: '#0e1736', ink: '#ffffff', accent: '#c8ced9', accent2: '#e9eef7', style: 'stars' },
  },
  {
    id: 'blackdevil', name: 'Black Devil', short: 'Devil', blurb: 'Black paper, black tip, sweet smoke.',
    tar: 9, nic: 0.7, co: 9, smoke: { tint: [0.62, 0.52, 0.56], amount: 0.18 },
    look: {
      paper: [0.035, 0.033, 0.035], tipA: [0.03, 0.03, 0.032], tipB: [0.07, 0.065, 0.07], cork: 0.25,
      band: [0.85, 0.18, 0.42], bandMetal: 0.6, bands: [1, 0], filter: [0.10, 0.10, 0.10], charcoal: 0,
      stars: 0, print: [0, 0, 0], tobacco: [0.9, 0.8, 0.8],
    },
    pack: { bg: '#0b0b0c', bg2: '#1c1c20', ink: '#f2f2f2', accent: '#e0306e', accent2: '#8a8a90', style: 'devil' },
  },
  {
    id: 'kretek', name: 'Kretek Clove', short: 'Kretek', blurb: 'Brown paper, clove that crackles.',
    tar: 18, nic: 1.4, co: 16, crackle: 1, smoke: { tint: [0.78, 0.70, 0.60], amount: 0.14 },
    look: {
      paper: [0.32, 0.20, 0.12], tipA: [0.52, 0.30, 0.13], tipB: [0.70, 0.48, 0.24], cork: 1,
      band: [0.95, 0.72, 0.30], bandMetal: 1, bands: [1, 0], filter: [0.82, 0.76, 0.66], charcoal: 0,
      stars: 0, print: [0, 0, 0], tobacco: [0.75, 0.62, 0.55],
    },
    pack: { bg: '#3a1f12', bg2: '#5e3418', ink: '#f1d79a', accent: '#d8a548', accent2: '#a3261c', style: 'kretek' },
  },
];

const BY_ID = Object.fromEntries(BRANDS.map((b) => [b.id, b]));
export const brand = (id) => BY_ID[id] || BRANDS[0];
