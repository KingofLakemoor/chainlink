import React from 'react';
import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db, app } from '../../../lib/firebase';
import { getStorage } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Select } from '../../../components/ui/select';
import { Card, CardContent } from '../../../components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { ArrowLeftIcon } from "lucide-react";

export const shopItemCategories = [
  "Banners (static)",
  "Banners (Dynamic)",
  "Avatar background (static)",
  "Avatar background (dynamic)",
  "Title regular",
  "Title glow",
  "Merch",
  "Gift Card",
  "Uncategorized"
] as const;

export const shopItemTypes = [
  "PROFILE_BANNER",
  "AVATAR_RING",
  "TITLE",
  "MERCH",
  "GIFT_CARD"
] as const;

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  type: z.enum(shopItemTypes),
  category: z.enum(shopItemCategories).optional(),
  cost: z.coerce.number().min(0, "Cost must be a positive number"),
  active: z.boolean().default(true),
  forSale: z.boolean().default(true),
  premiumOnly: z.boolean().default(false),
  featured: z.boolean().default(false),
  image: z.string().optional(), thumbnail: z.string().optional(),
  preview: z.string().optional(),
  order: z.coerce.number().optional(),
  collectionId: z.string().optional()
});

export default function CreateShopItemPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      type: "PROFILE_BANNER",
      category: "Uncategorized",
      cost: 0,
      active: true,
      forSale: true,
      premiumOnly: false,
      featured: false,
      image: "", thumbnail: "",
      preview: "",
      order: 0,
      collectionId: ""
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "shopItems"), {
        ...values,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      navigate("/admin/shopItems");
    } catch (error) {
      console.error("Error creating shop item:", error);
      alert("Failed to create shop item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="m-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="outline" onClick={() => navigate('/admin/shopItems')}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-zinc-50">Create Shop Item</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Item Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Type (Internal System ID)</FormLabel>
                      <FormControl>
                        <Select
                          onChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <option value="" disabled>Select item type</option>
                          {shopItemTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Category (Display Only)</FormLabel>
                      <FormControl>
                        <Select
                          onChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <option value="" disabled>Select category</option>
                          {shopItemCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="featured"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <input type="checkbox" checked={field.value} onChange={field.onChange} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-green-500 focus:ring-green-500/20" />
                      </FormControl>
                      <FormLabel>Featured</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost (Links)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <input type="checkbox" checked={field.value} onChange={field.onChange} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-green-500 focus:ring-green-500/20" />
                      </FormControl>
                      <FormLabel>Active (Visible in DB)</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="forSale"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <input type="checkbox" checked={field.value} onChange={field.onChange} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-green-500 focus:ring-green-500/20" />
                      </FormControl>
                      <FormLabel>For Sale (Can be shown in shop)</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="premiumOnly"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <input type="checkbox" checked={field.value} onChange={field.onChange} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-green-500 focus:ring-green-500/20" />
                      </FormControl>
                      <FormLabel>Premium Only (Requires ChainLink Pro)</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              
                  

              <FormField
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
              />
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
              />

              <FormField
                control={form.control}
                name="preview"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preview (Tailwind Class or URL)</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="e.g. bg-gradient-to-r from-red-700 to-orange-500" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="collectionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Collection ID (Grouping Tag)</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="e.g. ocean, inferno" {...field} />
                    </FormControl>
                    <FormDescription>
                      Used to group related items together in sets (e.g. rings, banners, titles).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Shop Item"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
