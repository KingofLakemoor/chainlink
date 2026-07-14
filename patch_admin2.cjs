const fs = require('fs');

function removeHandleImageUpload(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');
  const uploadImageHtml = `<FormItem>
                    <FormLabel>Upload Image</FormLabel>
                    <FormControl>
                      <Input type="file" accept="image/*" onChange={handleImageUpload} />
                    </FormControl>
                  </FormItem>`;
  // replace all matching blocks
  content = content.replace(/<FormItem>\s*<FormLabel>Upload Image<\/FormLabel>\s*<FormControl>\s*<Input type="file" accept="image\/\*" onChange=\{handleImageUpload\} \/>\s*<\/FormControl>\s*<\/FormItem>/g, '');
  fs.writeFileSync(filepath, content);
}

removeHandleImageUpload('src/pages/admin/shopItems/EditShopItemPage.tsx');
removeHandleImageUpload('src/pages/admin/shopItems/CreateShopItemPage.tsx');
