const fs = require('fs');

const files = [
    'src/components/ui/avatar-rings/hip/index.jsx',
    'src/components/ui/avatar-rings/prime-circuit-ring/index.jsx',
    'src/components/ui/avatar-rings/hexagons/index.jsx',
    'src/components/ui/avatar-rings/inferno/index.jsx',
    'src/components/ui/avatar-rings/mandala/index.jsx',
    'src/components/ui/avatar-rings/ocean/index.jsx',
    'src/components/ui/avatar-rings/phantomstar/index.jsx'
];

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace window resize with ResizeObserver
    if (!content.includes('ResizeObserver')) {
        content = content.replace(/window\.addEventListener\("resize",\s*resize,\s*false\);/g, 
            'const resizeObserver = new ResizeObserver(() => resize());\n        resizeObserver.observe(ctn);');
        content = content.replace(/window\.removeEventListener\("resize",\s*resize\);/g,
            'resizeObserver.disconnect();');
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
}
