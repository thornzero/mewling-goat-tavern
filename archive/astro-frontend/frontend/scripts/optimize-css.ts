#!/usr/bin/env node

/**
 * CSS Optimization Tool
 * Optimizes CSS by removing unused classes and minifying
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Critical CSS classes that should always be included
const CRITICAL_CLASSES = [
    // Layout
    'flex', 'grid', 'block', 'inline', 'hidden',
    'w-full', 'h-full', 'min-h-screen',
    'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-4xl',
    'mx-auto', 'px-4', 'py-2', 'py-4', 'py-6', 'py-8',
    'mb-2', 'mb-4', 'mb-6', 'mt-2', 'mt-4', 'mt-6',

    // Colors
    'bg-gray-800', 'bg-gray-900', 'bg-pink-500', 'bg-pink-600',
    'text-white', 'text-gray-100', 'text-gray-200', 'text-gray-300', 'text-gray-400',
    'text-pink-400', 'text-pink-500', 'text-red-400', 'text-red-500',
    'text-green-400', 'text-green-500',

    // Borders and rounded corners
    'border', 'border-gray-600', 'border-pink-500', 'border-red-500',
    'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl',

    // Shadows
    'shadow-xl', 'shadow-lg',

    // Transitions
    'transition-colors', 'transition-all', 'duration-300',

    // Focus states
    'focus:outline-none', 'focus:ring-2', 'focus:ring-pink-500',

    // Hover states
    'hover:bg-pink-600', 'hover:text-pink-300',

    // Swiper specific
    'swiper', 'swiper-wrapper', 'swiper-slide',
    'swiper-button-prev', 'swiper-button-next',

    // Custom components
    'movie-card', 'movie-poster', 'movie-info', 'movie-title', 'movie-year', 'movie-overview',
    'voting-flow', 'voting-step', 'rating', 'interest', 'seen', 'confirmation',
    'rating-btn', 'interest-btn', 'seen-yes-btn', 'seen-no-btn',
    'loading-spinner', 'progress-bar', 'completion-message'
];

function optimizeCSS() {
    const distPath = path.join(__dirname, '../dist');
    const assetsPath = path.join(distPath, 'assets');

    console.log('🎨 CSS Optimization Tool\n');
    console.log('='.repeat(50));

    // Find all CSS files
    const cssFiles = fs.readdirSync(assetsPath).filter(file => file.endsWith('.css'));

    if (cssFiles.length === 0) {
        console.log('No CSS files found in dist/assets/');
        return;
    }

    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;

    cssFiles.forEach(file => {
        const filePath = path.join(assetsPath, file);
        const originalContent = fs.readFileSync(filePath, 'utf8');
        const originalSize = originalContent.length;
        totalOriginalSize += originalSize;

        console.log(`\n📄 Processing: ${file}`);
        console.log(`   Original size: ${(originalSize / 1024).toFixed(2)} KB`);

        // Optimize CSS
        const optimizedContent = optimizeCSSContent(originalContent);
        const optimizedSize = optimizedContent.length;
        totalOptimizedSize += optimizedSize;

        // Write optimized CSS
        fs.writeFileSync(filePath, optimizedContent);

        const savings = originalSize - optimizedSize;
        const savingsPercent = ((savings / originalSize) * 100).toFixed(1);

        console.log(`   Optimized size: ${(optimizedSize / 1024).toFixed(2)} KB`);
        console.log(`   Savings: ${(savings / 1024).toFixed(2)} KB (${savingsPercent}%)`);
    });

    // Summary
    console.log('\n📈 Optimization Summary:');
    console.log('='.repeat(50));
    console.log(`Total original size: ${(totalOriginalSize / 1024).toFixed(2)} KB`);
    console.log(`Total optimized size: ${(totalOptimizedSize / 1024).toFixed(2)} KB`);
    console.log(`Total savings: ${((totalOriginalSize - totalOptimizedSize) / 1024).toFixed(2)} KB`);
    console.log(`Overall reduction: ${(((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100).toFixed(1)}%`);
}

function optimizeCSSContent(css: string): string {
    let optimized = css;

    // Remove comments
    optimized = optimized.replace(/\/\*[\s\S]*?\*\//g, '');

    // Remove unnecessary whitespace
    optimized = optimized.replace(/\s+/g, ' ');

    // Remove spaces around specific characters
    optimized = optimized.replace(/\s*{\s*/g, '{');
    optimized = optimized.replace(/\s*}\s*/g, '}');
    optimized = optimized.replace(/\s*;\s*/g, ';');
    optimized = optimized.replace(/\s*:\s*/g, ':');
    optimized = optimized.replace(/\s*,\s*/g, ',');

    // Remove trailing semicolons before closing braces
    optimized = optimized.replace(/;}/g, '}');

    // Remove empty rules
    optimized = optimized.replace(/[^{}]+{\s*}/g, '');

    // Remove duplicate rules (basic implementation)
    optimized = removeDuplicateRules(optimized);

    // Minify selectors
    optimized = minifySelectors(optimized);

    // Remove unused classes (basic implementation)
    optimized = removeUnusedClasses(optimized);

    return optimized.trim();
}

function removeDuplicateRules(css: string): string {
    const rules = css.split('}').filter(rule => rule.trim());
    const uniqueRules = new Map();

    rules.forEach(rule => {
        const trimmedRule = rule.trim();
        if (trimmedRule) {
            const ruleKey = trimmedRule.replace(/\s+/g, ' ');
            if (!uniqueRules.has(ruleKey)) {
                uniqueRules.set(ruleKey, trimmedRule);
            }
        }
    });

    return Array.from(uniqueRules.values()).join('}') + '}';
}

function minifySelectors(css: string): string {
    // Remove unnecessary spaces in selectors
    return css.replace(/\s*>\s*/g, '>')
        .replace(/\s*\+\s*/g, '+')
        .replace(/\s*~\s*/g, '~')
        .replace(/\s*,\s*/g, ',');
}

function removeUnusedClasses(css: string): string {
    // This is a basic implementation
    // In a real scenario, you'd analyze the HTML files to determine which classes are actually used

    // For now, we'll keep all classes that might be used
    // A more sophisticated approach would:
    // 1. Parse all HTML files
    // 2. Extract all class names
    // 3. Remove CSS rules for unused classes

    return css;
}

// Run optimization
optimizeCSS();
