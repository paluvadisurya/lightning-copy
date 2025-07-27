// FastCopy Extension - Project Configuration Data
// Separated from main popup.js to reduce file size

const ProjectConfig = {
    // Available project icons - using all icons from project-icons folder
    icons: [
        'chat.svg', 'coffee.svg', 'compass.svg', 'copy.svg', 'crown.svg', 'cube.svg',
        'cursor.svg', 'database.svg', 'fire.svg', 'heart.svg', 'hourglass.svg', 'house.svg',
        'key.svg', 'map-pin-alt.svg', 'map-pin.svg', 'menu.svg', 'message-circle.svg', 'mic.svg',
        'mood-happy.svg', 'music-note.svg', 'my-location.svg', 'playlist-video.svg', 'push-pin.svg',
        'refresh.svg', 'route.svg', 'scissors.svg', 'shield-check.svg', 'watch.svg'
    ],

    // Available project colors with better distribution and more diverse hues
    colors: [
        {
            name: 'red', hue: 0,
            light: { bg: '#fef2f2', border: '#fecaca', icon: '#ef4444' },
            dark: { bg: '#450a0a', border: '#7f1d1d', icon: '#fca5a5' }
        },
        {
            name: 'orange', hue: 30,
            light: { bg: '#fff7ed', border: '#fdba74', icon: '#f97316' },
            dark: { bg: '#431407', border: '#9a3412', icon: '#fb923c' }
        },
        {
            name: 'amber', hue: 50,
            light: { bg: '#fffbeb', border: '#fed7aa', icon: '#f59e0b' },
            dark: { bg: '#451a03', border: '#92400e', icon: '#fcd34d' }
        },
        {
            name: 'yellow', hue: 60,
            light: { bg: '#fefce8', border: '#fde047', icon: '#eab308' },
            dark: { bg: '#422006', border: '#a16207', icon: '#facc15' }
        },
        {
            name: 'lime', hue: 80,
            light: { bg: '#f7fee7', border: '#bef264', icon: '#84cc16' },
            dark: { bg: '#1a2e05', border: '#4d7c0f', icon: '#a3e635' }
        },
        {
            name: 'green', hue: 120,
            light: { bg: '#f0fdf4', border: '#86efac', icon: '#22c55e' },
            dark: { bg: '#052e16', border: '#166534', icon: '#4ade80' }
        },
        {
            name: 'emerald', hue: 160,
            light: { bg: '#ecfdf5', border: '#6ee7b7', icon: '#10b981' },
            dark: { bg: '#064e3b', border: '#047857', icon: '#34d399' }
        },
        {
            name: 'teal', hue: 180,
            light: { bg: '#f0fdfa', border: '#5eead4', icon: '#14b8a6' },
            dark: { bg: '#042f2e', border: '#0f766e', icon: '#2dd4bf' }
        },
        {
            name: 'cyan', hue: 200,
            light: { bg: '#ecfeff', border: '#67e8f9', icon: '#06b6d4' },
            dark: { bg: '#164e63', border: '#0891b2', icon: '#22d3ee' }
        },
        {
            name: 'sky', hue: 210,
            light: { bg: '#f0f9ff', border: '#7dd3fc', icon: '#0284c7' },
            dark: { bg: '#0c4a6e', border: '#0369a1', icon: '#38bdf8' }
        },
        {
            name: 'blue', hue: 220,
            light: { bg: '#eff6ff', border: '#93c5fd', icon: '#3b82f6' },
            dark: { bg: '#1e3a8a', border: '#1d4ed8', icon: '#60a5fa' }
        },
        {
            name: 'indigo', hue: 240,
            light: { bg: '#eef2ff', border: '#a5b4fc', icon: '#6366f1' },
            dark: { bg: '#312e81', border: '#4338ca', icon: '#818cf8' }
        },
        {
            name: 'violet', hue: 260,
            light: { bg: '#f5f3ff', border: '#c4b5fd', icon: '#8b5cf6' },
            dark: { bg: '#4c1d95', border: '#6d28d9', icon: '#a78bfa' }
        },
        {
            name: 'purple', hue: 280,
            light: { bg: '#faf5ff', border: '#d8b4fe', icon: '#a855f7' },
            dark: { bg: '#581c87', border: '#7c3aed', icon: '#c084fc' }
        },
        {
            name: 'fuchsia', hue: 300,
            light: { bg: '#fdf4ff', border: '#f0abfc', icon: '#d946ef' },
            dark: { bg: '#701a75', border: '#a21caf', icon: '#e879f9' }
        },
        {
            name: 'pink', hue: 320,
            light: { bg: '#fdf2f8', border: '#fbcfe8', icon: '#ec4899' },
            dark: { bg: '#831843', border: '#be185d', icon: '#f472b6' }
        },
        {
            name: 'rose', hue: 340,
            light: { bg: '#fff1f2', border: '#fecdd3', icon: '#f43f5e' },
            dark: { bg: '#881337', border: '#be123c', icon: '#fb7185' }
        }
    ]
};

// Make available globally
window.ProjectConfig = ProjectConfig; 