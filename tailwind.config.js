/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./*.html",
        "./assets/**/*.js"
    ],
    theme: {
        extend: {
            fontFamily: {
                display: ['"Syncopate"', 'sans-serif'],
                body: ['"Manrope"', 'sans-serif'],
            },
            colors: {
                obsidian: '#050505',
                deepSpace: '#0B1120',
                taurusGold: '#FFD700',
                cyberGray: '#1E293B',
                glass: 'rgba(255, 255, 255, 0.03)',
                glassBorder: 'rgba(255, 255, 255, 0.08)',
            },
            backgroundImage: {
                'symmetry-grid': "radial-gradient(circle at center, transparent 0%, #050505 100%), linear-gradient(rgba(255, 215, 0, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 215, 0, 0.03) 1px, transparent 1px)",
            },
            animation: {
                'hover-glow': 'hoverGlow 4s ease-in-out infinite',
                'float-center': 'floatCenter 6s ease-in-out infinite',
                'scan-line': 'scanLine 5s linear infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                hoverGlow: {
                    '0%, 100%': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                    '50%': { borderColor: 'rgba(255, 215, 0, 0.5)', boxShadow: '0 0 30px rgba(255, 215, 0, 0.1)' },
                },
                floatCenter: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-15px)' },
                },
                scanLine: {
                    '0%': { transform: 'translateY(-100%)' },
                    '100%': { transform: 'translateY(500%)' }
                }
            }
        }
    },
    plugins: [],
}
