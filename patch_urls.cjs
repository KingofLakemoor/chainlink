const fs = require('fs');
const path = require('path');

// 1. Update shop_items.json
const shopItemsFile = path.join('shop_items.json');
let shopItemsContent = fs.readFileSync(shopItemsFile, 'utf8');

// The tee banner image
shopItemsContent = shopItemsContent.replace(
  /\/images\/merch\/tee-banner\.png/g,
  'gs://chainlink-2-72590.firebasestorage.app/tee banner.png'
);

// The trucker hat image
shopItemsContent = shopItemsContent.replace(
  /\/images\/merch\/trucker banner\.png/g,
  'gs://chainlink-2-72590.firebasestorage.app/trucker banner.png'
);

// The 4th of july hero banner
shopItemsContent = shopItemsContent.replace(
  /\/images\/fourth_of_july_hero\.png/g,
  'gs://chainlink-2-72590.firebasestorage.app/4th of July hero banner.png'
);

fs.writeFileSync(shopItemsFile, shopItemsContent);


// 2. Update ShopPage.tsx
const shopPageFile = path.join('src', 'pages', 'shop', 'ShopPage.tsx');
let shopPageContent = fs.readFileSync(shopPageFile, 'utf8');

shopPageContent = shopPageContent.replace(
  /\/images\/merch\/tee-banner\.png/g,
  'gs://chainlink-2-72590.firebasestorage.app/tee banner.png'
);

shopPageContent = shopPageContent.replace(
  /\/images\/merch\/trucker banner\.png/g,
  'gs://chainlink-2-72590.firebasestorage.app/trucker banner.png'
);

shopPageContent = shopPageContent.replace(
  /\/images\/merch\/602 Merch Banner\.jpeg/g,
  'gs://chainlink-2-72590.firebasestorage.app/602 Merch Banner.jpeg'
);

// We also need to change the `img` tags to `FirebaseImage` in ShopPage for these gs:// urls!
// But wait, the standard `<img src={item.image}>` might be used for `merch_level_one_tee`.
// Let's check if we need to replace `<img loading="lazy" src={item.image}` with `<FirebaseImage` inside ShopPage.

fs.writeFileSync(shopPageFile, shopPageContent);
