const fs = require('fs');
let code = fs.readFileSync('src/apiRouter.ts', 'utf8');

code = code.replace(
/      let productId = '';\n      if \(amount === 150\) \{\n        priceInCents = 525;\n        productId = 'prod_UbeZGEJ7qNYzqh';\n      \} else if \(amount === 350\) \{\n        priceInCents = 1049;\n        productId = 'prod_UbeanXV0kHAOmx';\n      \} else if \(amount === 1050\) \{\n        priceInCents = 2999;\n        productId = 'prod_UbeaOKAeLRoMYA';\n      \} else if \(amount === 1800\) \{\n        priceInCents = 4999;\n        productId = 'prod_UbeaHkQfsij3Je';\n      \} else \{/,
`      let productName = '';
      if (amount === 150) {
        priceInCents = 525;
        productName = '150 Links Pack';
      } else if (amount === 350) {
        priceInCents = 1049;
        productName = '350 Links Pack';
      } else if (amount === 1050) {
        priceInCents = 2999;
        productName = '1050 Links Pack';
      } else if (amount === 1800) {
        priceInCents = 4999;
        productName = '1800 Links Pack';
      } else {`
);

code = code.replace(
/      priceData = \{\n        currency: 'usd',\n        product: productId,\n        unit_amount: priceInCents,\n      \};/,
`      priceData = {
        currency: 'usd',
        product_data: { name: productName },
        unit_amount: priceInCents,
      };`
);

// For premium subscription, it also uses a hardcoded productId!
code = code.replace(
/      priceData = \{\n        currency: 'usd',\n        product: 'prod_Ubebt3HfTCfFfc',\n        unit_amount: 499,\n        recurring: \{\n          interval: 'month',\n        \},\n      \};/,
`      priceData = {
        currency: 'usd',
        product_data: { name: 'ChainLink Pro Subscription' },
        unit_amount: 499,
        recurring: {
          interval: 'month',
        },
      };`
);

fs.writeFileSync('src/apiRouter.ts', code);
