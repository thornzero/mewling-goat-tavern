# Mewling Goat Movie Poll

A responsive movie voting application with mobile-optimized design.

## Features

### Desktop Version (`index.html`)

- Full-featured carousel interface
- Keyboard shortcuts (1=❤️, 2=😐, 3=🗑️, S=Seen it)
- Detailed movie information display
- Swiper pagination and navigation

### Mobile Version (`index-mobile.html`)

- Touch-optimized interface
- Large, easy-to-tap buttons
- Simplified navigation
- Mobile-specific layout
- Help modal with instructions
- Toast notifications

## Mobile Detection

The application automatically detects mobile devices and redirects to the mobile-optimized version. Mobile detection is based on:

- User agent string (iOS, Android, etc.)
- Screen width (≤768px)

### Force Desktop Version

Add `?desktop=true` to the URL to force the desktop version on mobile devices.

## File Structure

```text
docs/
├── index.html              # Desktop version (auto-redirects mobile)
├── index-mobile.html       # Mobile-optimized version
├── js/
│   └── script.js           # Desktop JavaScript
├── script-mobile.js        # Mobile JavaScript
├── output.css              # Compiled Tailwind CSS
├── input.css               # Tailwind source + custom styles
└── README.md               # This file
```

## Mobile Features

### Touch-Friendly Design

- Minimum 44px touch targets
- Large vote buttons (❤️, 😐, 🗑️)
- Easy-to-tap navigation arrows
- Responsive layout

### Mobile-Specific UI

- Fixed header with movie info
- Bottom action panel
- Floating help button
- Modal instructions
- Toast notifications

### Performance Optimizations

- Local storage caching
- Optimized image loading
- Minimal DOM manipulation
- Efficient event handling

## Backend Integration

Both versions connect to the same Google Apps Script backend with:

- Rate limiting protection
- TMDB API integration
- Vote submission
- Error handling

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Progressive enhancement for older browsers

## Development

To rebuild CSS after changes:

```bash
npx tailwindcss -i input.css -o output.css
```
