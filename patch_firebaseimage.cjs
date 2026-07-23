const fs = require('fs');
const file = 'src/components/ui/FirebaseImage.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /  const \[resolvedSrc, setResolvedSrc\] = useState<string \| undefined>\(\n    \(src && !src.startsWith\('gs:\/\/'\)\) \? src : fallback \|\| undefined\n  \);/,
  `  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(\n    (src && !src.startsWith('gs://')) ? (src.startsWith('/contestants/') ? 'https://scriptless.club602.com' + src : src) : fallback || undefined\n  );`
);

code = code.replace(
  /      \} else \{\n        if \(isMounted\) \{\n          setResolvedSrc\(src\);\n        \}\n      \}/,
  `      } else {\n        if (isMounted) {\n          setResolvedSrc(src.startsWith('/contestants/') ? 'https://scriptless.club602.com' + src : src);\n        }\n      }`
);

fs.writeFileSync(file, code);
