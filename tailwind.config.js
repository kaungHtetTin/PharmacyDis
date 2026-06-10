/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './resources/**/*.blade.php',
        './resources/**/*.js',
        './resources/**/*.jsx',
    ],
    theme: {
        extend: {
            colors: {
                primary: 'var(--color-primary)',
                primaryDark: 'var(--color-primary-dark)',
                primarySoft: 'var(--color-primary-soft)',
                appBg: 'var(--color-bg)',
                surface: 'var(--color-surface)',
                appText: 'var(--color-text)',
                muted: 'var(--color-muted)',
                soft: 'var(--color-soft)',
                glass: 'var(--color-glass)',
                line: 'var(--color-border)',
            },
            boxShadow: {
                app: 'var(--shadow)',
            },
            fontFamily: {
                sans: ['Inter', 'Noto Sans Myanmar', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
