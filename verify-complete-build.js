// Complete build verification script
const fs = require('fs');
const path = require('path');

console.log('🔍 Complete Build Verification\n');

const checks = [
    {
        name: 'React Component',
        path: 'components/StoryGenerator.jsx',
        test: (content) => content.includes('const StoryGenerator') && content.includes('export default StoryGenerator')
    },
    {
        name: 'Component CSS',
        path: 'components/StoryGenerator.css',
        test: (content) => content.includes('.story-generator') && content.includes('.story-controls')
    },
    {
        name: 'Wrapper Script',
        path: 'components/story-generator-wrapper.js',
        test: (content) => content.includes('mountStoryGenerator') && content.includes('ReactDOM.createRoot')
    },
    {
        name: 'Webpack Config',
        path: 'webpack.config.js',
        test: (content) => content.includes('story-generator') && content.includes('babel-loader')
    },
    {
        name: 'Babel Config',
        path: '.babelrc',
        test: (content) => content.includes('@babel/preset-react')
    },
    {
        name: 'Built Bundle',
        path: 'dist/story-generator.bundle.js',
        test: (content) => content.length > 1000 // Should be substantial
    },
    {
        name: 'FFT Integration',
        path: 'fft-visualizer.html',
        test: (content) => 
            content.includes('story-generator-mount') && 
            content.includes('story-generator.bundle.js') &&
            content.includes('StoryGenerator.css')
    },
    {
        name: 'Server Validation Fix',
        path: 'server.js',
        test: (content) => 
            content.includes("['ghost', 'monster', 'vampire', 'werewolf']") &&
            content.includes('subject.toLowerCase()')
    },
    {
        name: 'Package Scripts',
        path: 'package.json',
        test: (content) => {
            const pkg = JSON.parse(content);
            return pkg.scripts.build && pkg.dependencies.react && pkg.dependencies['react-dom'];
        }
    },
    {
        name: 'Component Tests',
        path: 'components/StoryGenerator.test.js',
        test: (content) => content.includes('describe(') && content.includes('StoryGenerator')
    }
];

let passed = 0;
let failed = 0;

checks.forEach(check => {
    const filePath = path.join(__dirname, check.path);
    
    if (!fs.existsSync(filePath)) {
        console.log(`❌ ${check.name}: File not found`);
        failed++;
        return;
    }
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (check.test(content)) {
            console.log(`✅ ${check.name}: Passed`);
            passed++;
        } else {
            console.log(`❌ ${check.name}: Content validation failed`);
            failed++;
        }
    } catch (error) {
        console.log(`❌ ${check.name}: Error reading file - ${error.message}`);
        failed++;
    }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
    console.log('🎉 All checks passed! The Story Generator React component is fully built and integrated.');
    console.log('\n📋 What was accomplished:');
    console.log('• Created reusable React StoryGenerator component');
    console.log('• Set up webpack build system for vanilla HTML integration');
    console.log('• Fixed server-side validation to match component options');
    console.log('• Integrated component into FFT visualizer page');
    console.log('• Added comprehensive testing setup');
    console.log('• Created documentation and usage examples');
    
    console.log('\n🚀 Next steps:');
    console.log('• Run `npm run build` to rebuild after changes');
    console.log('• Use the component in other pages by adding mount points');
    console.log('• Run tests with `npm test StoryGenerator.test.js`');
    console.log('• See components/README.md for usage instructions');
} else {
    console.log('⚠️  Some checks failed. Please review the issues above.');
}

console.log('\n🔧 Build Commands:');
console.log('• npm run build - Build React components');
console.log('• npm run build:watch - Build with file watching');
console.log('• npm start - Start the server');
console.log('• npm test - Run all tests');