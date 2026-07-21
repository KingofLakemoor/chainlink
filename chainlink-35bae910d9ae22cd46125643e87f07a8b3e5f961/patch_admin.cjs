const fs = require('fs');

function patchFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');

  // Add thumbnail to z.object schema
  content = content.replace(/image: z\.string\(\)\.optional\(\),/, 'image: z.string().optional(), thumbnail: z.string().optional(),');

  // Add default values for thumbnail
  content = content.replace(/image: data\.image \|\| "",/, 'image: data.image || "", thumbnail: data.thumbnail || "",');
  content = content.replace(/image: "",/, 'image: "", thumbnail: "",');

  // Add thumbnail field in JSX
  const imageField = `              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image (Tailwind Class or URL)</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="e.g. bg-gradient-to-r from-red-700 to-orange-500" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />`;
  const replacement = imageField + `
              <FormField
                control={form.control}
                name="thumbnail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thumbnail URL (Overrides Component Render in Shop)</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="e.g. /images/thumbnail.png" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />`;
  content = content.replace(imageField, replacement);
  fs.writeFileSync(filepath, content);
}

patchFile('src/pages/admin/shopItems/EditShopItemPage.tsx');
patchFile('src/pages/admin/shopItems/CreateShopItemPage.tsx');
