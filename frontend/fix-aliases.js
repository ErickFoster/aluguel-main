const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walk(filePath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            fixFile(filePath);
        }
    });
}

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('@/')) return;

    const fileDir = path.dirname(filePath);
    const relativeToSrc = path.relative(fileDir, srcDir) || '.';

    // Replace '@/something' with 'relativeToSrc/something'
    // We need to handle cases like '@/lib/utils' -> '../../lib/utils'
    const newContent = content.replace(/['"]@\/(.*?)['"]/g, (match, p1) => {
        let relPath = path.join(relativeToSrc, p1).replace(/\\/g, '/');
        if (!relPath.startsWith('.')) {
            relPath = './' + relPath;
        }
        return match.startsWith("'") ? `'${relPath}'` : `"${relPath}"`;
    });

    if (content !== newContent) {
        console.log(`Fixing aliases in: ${path.relative(srcDir, filePath)}`);
        fs.writeFileSync(filePath, newContent, 'utf8');
    }
}

walk(srcDir);
console.log('Alias fix complete.');
