/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./utils/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                taurusGold: '#FFD700', // Matching main site gold color
            },
            fontFamily: {
                sans: ['Manrope', 'sans-serif'],
                poppins: ['Manrope', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
