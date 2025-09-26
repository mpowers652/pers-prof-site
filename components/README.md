# React Components

## StoryGenerator Component

A reusable React component for the story generator functionality.

### Usage in React Applications

```jsx
import StoryGenerator from './components/StoryGenerator.jsx';
import './components/StoryGenerator.css';

function App() {
    return (
        <div>
            <StoryGenerator 
                user={currentUser}
                showTitle={true}
                compact={false}
                className="my-custom-class"
                style={{ margin: '20px' }}
            />
        </div>
    );
}
```

### Usage in Vanilla HTML Pages

1. Include the bundled script and CSS:
```html
<link rel="stylesheet" href="components/StoryGenerator.css">
<script src="dist/story-generator.bundle.js"></script>
```

2. Add a mount point in your HTML:
```html
<div id="story-generator-mount"></div>
```

3. The component will auto-mount on DOMContentLoaded, or you can manually mount:
```javascript
// Manual mounting with custom props
window.mountStoryGenerator('my-container-id', {
    user: window.currentUser,
    showTitle: false,
    compact: true
});
```

### Props

- `user`: User object with subscription and role information
- `showTitle`: Boolean to show/hide the component title (default: true)
- `compact`: Boolean for compact layout (default: false)
- `className`: Additional CSS classes
- `style`: Inline styles object

### Building

Run `npm run build` to compile the React component for use in vanilla HTML pages.

Run `npm run build:watch` for development with automatic rebuilding.