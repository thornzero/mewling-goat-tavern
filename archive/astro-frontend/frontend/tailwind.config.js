/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
  ],
  safelist: [
    'bg-gray-900', 'text-gray-100', 'font-sans',
    'relative', 'min-h-screen', 'flex', 'items-center', 'justify-center', 'p-4',
    'bg-gray-800', 'max-w-md', 'p-8', 'rounded-xl', 'shadow-xl', 'w-full', 'z-10',
    'text-3xl', 'font-bold', 'text-pink-500', 'mb-6', 'text-center',
    'mb-6', 'block', 'font-medium', 'mb-2', 'text-lg',
    'w-full', 'px-4', 'py-3', 'bg-gray-700', 'text-gray-100', 'rounded-md', 'focus:outline-none', 'focus:ring-2', 'focus:ring-pink-500',
    'w-full', 'bg-pink-500', 'hover:bg-pink-600', 'text-white', 'font-bold', 'py-3', 'px-6', 'rounded-md', 'transition-colors', 'disabled:bg-gray-600', 'disabled:cursor-not-allowed',
    'mt-4', 'text-center', 'text-gray-400', 'hidden',
    'inline-block', 'animate-spin', 'rounded-full', 'h-6', 'w-6', 'border-b-2', 'border-pink-500',
    'mt-2',
    'bg-gray-800', 'max-w-4xl', 'p-6', 'relative', 'rounded-xl', 'shadow-xl', 'w-full', 'z-10', 'hidden',
    'flex', 'items-center', 'justify-between', 'mb-4',
    'text-2xl', 'font-bold', 'text-pink-500',
    'flex', 'items-center', 'space-x-4',
    'text-pink-400', 'hover:text-pink-300', 'text-sm', 'font-medium', 'transition-colors',
    'text-gray-400',
    'swiper', 'swiper-wrapper', 'swiper-button-hidden', 'swiper-button-prev', 'swiper-button-next', 'text-pink-400'
  ]
}