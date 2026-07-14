const fs = require('fs');

let content = fs.readFileSync('src/components/ui/FirebaseImage.tsx', 'utf8');
content = content.replace(
  /onError=\{\(e\) => \{[\s\S]*?\}\}/,
  `onError={(e) => {
        if (props.onError) {
           props.onError(e);
        }
        if (fallback && e.currentTarget.src !== fallback) {
          e.currentTarget.src = fallback;
        } else if (!props.onError) {
          e.currentTarget.style.display = 'none';
        }
      }}`
);
fs.writeFileSync('src/components/ui/FirebaseImage.tsx', content);
