const fs = require('fs');

function patchShopPage() {
  let content = fs.readFileSync('src/pages/shop/ShopPage.tsx', 'utf8');
  content = content.replace(
    /\{item\.type === 'PROFILE_BANNER' && \(\s*ProfileBannerMap\[item\.image\] \? \(/g,
    `{item.type === 'PROFILE_BANNER' && (
              item.thumbnail ? (
                  <img loading="lazy" src={item.thumbnail} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
              ) : ProfileBannerMap[item.image] ? (`
  );
  
  content = content.replace(
    /\{AvatarRingMap\[item\.image\] \? \(\s*<>/g,
    `{item.thumbnail ? (
                  <img loading="lazy" src={item.thumbnail} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : AvatarRingMap[item.image] ? (
                   <>`
  );

  content = content.replace(
    /\{TitleMap\[item\.preview \|\| item\.image \|\| ''\] \? \(/g,
    `{item.thumbnail ? (
                  <img loading="lazy" src={item.thumbnail} alt={item.name} className="w-full h-full object-contain max-h-16" />
                ) : TitleMap[item.preview || item.image || ''] ? (`
  );
  
  fs.writeFileSync('src/pages/shop/ShopPage.tsx', content);
}

patchShopPage();
