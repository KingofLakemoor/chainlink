const fs = require('fs');
let content = fs.readFileSync('src/components/ui/FirebaseImage.tsx', 'utf8');

content = content.replace(
  /const \[resolvedSrc, setResolvedSrc\] = useState<string \| undefined>\(src \|\| fallback \|\| undefined\);/,
  `const [resolvedSrc, setResolvedSrc] = useState<string | undefined>((src && !src.startsWith('gs://')) ? src : fallback || undefined);`
);

content = content.replace(
  /setResolvedSrc\(url\);/,
  `setResolvedSrc(url);`
);

content = content.replace(
  /<img/g,
  `<img\n      style={{ display: resolvedSrc ? '' : 'none' }}`
);

fs.writeFileSync('src/components/ui/FirebaseImage.tsx', content);
