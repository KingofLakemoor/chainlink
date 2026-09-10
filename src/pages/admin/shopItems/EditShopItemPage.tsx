import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { FirebaseImage } from '../../../components/ui/FirebaseImage';
import { ProfileBannerMap, AvatarRingMap } from '../../../lib/cosmetics';
import { TitleMap } from '../../../components/ui/titles';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  ArrowLeft, ShoppingBag, Edit3, Sparkles, Coins, Crown, CheckCircle2,
  Tag, Eye, RefreshCw, HelpCircle
} from "lucide-react";
import { shopItemTypes, shopItemCategories } from './CreateShopItemPage';

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  type: z.enum(shopItemTypes),
  category: z.string().min(1, "Category is required"),
  cost: z.coerce.number().min(0, "Cost must be a positive number"),
  active: z.boolean().default(true),
  forSale: z.boolean().default(true),
  premiumOnly: z.boolean().default(false),
  featured: z.boolean().default(false),
  requiresShipping: z.boolean().default(false),
  image: z.string().optional().default(""),
  thumbnail: z.string().optional().default(""),
  preview: z.string().optional().default(""),
  order: z.coerce.number().optional().default(1),
  collectionId: z.string().optional().default("")
});

export default function EditShopItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

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
      requiresShipping: false,
      image: "",
      thumbnail: "",
      preview: "",
      order: 1,
      collectionId: ""
    },
  });

  const watchAll = form.watch();

  const registeredBanners = Object.keys(ProfileBannerMap);
  const registeredRings = Object.keys(AvatarRingMap);
  const registeredTitles = Object.keys(TitleMap);

  useEffect(() => {
    const fetchShopItem = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "shopItems", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          form.reset({
            name: data.name || "",
            description: data.description || "",
            type: data.type || "PROFILE_BANNER",
            category: data.category || "Uncategorized",
            cost: data.cost ?? 0,
            active: data.active ?? true,
            forSale: data.forSale ?? true,
            premiumOnly: data.premiumOnly ?? false,
            featured: data.featured ?? false,
            requiresShipping: data.requiresShipping ?? false,
            image: data.image || "",
            thumbnail: data.thumbnail || "",
            preview: data.preview || "",
            order: data.order ?? 1,
            collectionId: data.collectionId || ""
          });
        }
      } catch (error) {
        console.error("Error fetching shop item:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchShopItem();
  }, [id, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "shopItems", id), {
        ...values,
        updatedAt: Date.now()
      });
      navigate("/admin/shopItems");
    } catch (error) {
      console.error("Error updating shop item:", error);
      alert("Failed to update shop item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderLivePreview = () => {
    const { name, description, cost, type, category, premiumOnly, image, thumbnail, preview } = watchAll;
    const imageKey = image || '';
    const previewKey = preview || imageKey;

    return (
      <div className="bg-[#121212] border border-zinc-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        {/* Banner / Visual Stage */}
        <div className="h-40 bg-zinc-950 flex items-center justify-center relative overflow-hidden border-b border-zinc-800">
          {type === 'PROFILE_BANNER' && (
            thumbnail ? (
              <FirebaseImage src={thumbnail} alt={name || 'Preview'} className="absolute inset-0 w-full h-full object-cover" />
            ) : ProfileBannerMap[imageKey] ? (
              <div className="absolute inset-0">
                {React.createElement(ProfileBannerMap[imageKey], { isStatic: false })}
              </div>
            ) : (imageKey.startsWith('/') || imageKey.startsWith('http') || imageKey.startsWith('gs://')) ? (
              <FirebaseImage src={imageKey} alt={name || 'Preview'} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className={`absolute inset-0 ${imageKey || 'bg-gradient-to-r from-zinc-800 to-zinc-900'}`} />
            )
          )}

          {type === 'AVATAR_RING' && (
            <div className="relative w-20 h-20 flex items-center justify-center z-10">
              {thumbnail ? (
                <FirebaseImage src={thumbnail} alt={name || 'Preview'} className="absolute inset-0 w-full h-full object-cover rounded-full" />
              ) : AvatarRingMap[imageKey] ? (
                <>
                  <div className="absolute inset-0 transform scale-[1.35]">
                    {React.createElement(AvatarRingMap[imageKey], { isStatic: false })}
                  </div>
                  <div className="relative w-full h-full p-2">
                    <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400 font-medium">Avatar</div>
                  </div>
                </>
              ) : (
                <div className={`w-20 h-20 rounded-full border-4 ${imageKey || 'border-zinc-600'} bg-zinc-900 flex items-center justify-center text-xs text-zinc-400 font-semibold`}>
                  Avatar
                </div>
              )}
            </div>
          )}

          {type === 'TITLE' && (
            <div className="z-10 px-4">
              {TitleMap[previewKey || imageKey] ? (
                React.createElement(TitleMap[previewKey || imageKey], { isStatic: false })
              ) : (
                <div className={`text-lg font-bold text-zinc-200 px-4 py-2 bg-black/60 rounded-lg border border-zinc-700/80 ${imageKey || ''}`}>
                  {name || 'Title Preview'}
                </div>
              )}
            </div>
          )}

          {(type === 'MERCH' || type === 'GIFT_CARD') && (
            <div className="w-full h-full relative flex items-center justify-center">
              {imageKey ? (
                <FirebaseImage src={imageKey} alt={name || 'Merch'} className="w-full h-full object-cover" />
              ) : (
                <ShoppingBag className="w-12 h-12 text-zinc-600" />
              )}
            </div>
          )}
        </div>

        {/* Details Card Preview */}
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-lg font-bold text-zinc-100">{name || 'Item Name'}</h4>
              {premiumOnly && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-purple-400 mt-0.5">
                  <Crown className="w-3 h-3 text-purple-400" /> Pro Exclusive
                </span>
              )}
            </div>
            <span className="text-[10px] px-2 py-1 bg-zinc-800 text-zinc-400 rounded uppercase font-bold tracking-wider">
              {category || type}
            </span>
          </div>

          <p className="text-xs text-zinc-400 min-h-[36px] line-clamp-2">
            {description || 'Item description will appear here in the shop storefront card.'}
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <div className="font-mono font-bold text-cyan-400 flex items-center gap-1 text-base">
              <Coins className="w-4 h-4 text-cyan-400" /> {(cost || 0).toLocaleString()}
            </div>
            <Button
              disabled
              className="bg-[#22c55e] opacity-80 text-white font-semibold text-xs px-4"
            >
              Buy Now
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-zinc-500 flex items-center justify-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-[#22c55e]" /> Loading shop item configuration...
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#121212] border border-zinc-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/shopItems')}
            className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to List
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100 font-display flex items-center gap-2">
              <Edit3 className="w-6 h-6 text-[#22c55e]" />
              Edit Shop Item: <span className="font-mono text-cyan-400">{id}</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">Update item pricing, availability, and component asset key references.</p>
          </div>
        </div>
      </div>

      {/* Quick Component Key Mapping Helper Box */}
      <div className="bg-gradient-to-r from-emerald-950/30 via-zinc-900 to-cyan-950/30 border border-emerald-500/20 rounded-xl p-4 text-xs space-y-2">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
          <HelpCircle className="w-4 h-4" /> Quick Mapping Guide for Shop Items
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-zinc-300">
          <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-lg">
            <span className="font-bold text-cyan-400 block mb-1">1. Custom React Shader/Component</span>
            Set <code className="text-emerald-300">image</code> to a registered key (e.g. <code className="text-zinc-200">EmeraldStormBanner</code>, <code className="text-zinc-200">BullBearAvatarRing</code>). Select from dropdown below.
          </div>
          <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-lg">
            <span className="font-bold text-cyan-400 block mb-1">2. Image Asset or Storage URL</span>
            Set <code className="text-emerald-300">image</code> or <code className="text-emerald-300">thumbnail</code> to an image URL (e.g. <code className="text-zinc-200">/images/item.png</code> or <code className="text-zinc-200">gs://...</code>).
          </div>
          <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-lg">
            <span className="font-bold text-cyan-400 block mb-1">3. Tailwind CSS Style Class</span>
            For static color gradient banners, set <code className="text-emerald-300">image</code> to Tailwind classes (e.g. <code className="text-zinc-200">bg-gradient-to-r from-red-500 to-red-900</code>).
          </div>
        </div>
      </div>

      {/* Grid Layout: Form on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-7">
          <Card className="bg-[#121212] border-zinc-800 shadow-xl">
            <CardHeader className="border-b border-zinc-800 pb-4">
              <CardTitle className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-400" /> Item Details & Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-zinc-300 font-semibold">Display Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. The Emerald Storm"
                            className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-emerald-500"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-zinc-300 font-semibold">Item Type (System)</FormLabel>
                          <FormControl>
                            <select
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                              value={field.value}
                              onChange={(e) => {
                                field.onChange(e);
                                if (e.target.value === 'PROFILE_BANNER') form.setValue('category', 'Banners (Dynamic)');
                                else if (e.target.value === 'AVATAR_RING') form.setValue('category', 'Avatar background (dynamic)');
                                else if (e.target.value === 'TITLE') form.setValue('category', 'Title regular');
                                else if (e.target.value === 'MERCH') form.setValue('category', 'Merch');
                              }}
                            >
                              {shopItemTypes.map((type) => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-zinc-300 font-semibold">Display Category</FormLabel>
                          <FormControl>
                            <select
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                              value={field.value}
                              onChange={field.onChange}
                            >
                              {shopItemCategories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </FormControl>
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
                        <FormLabel className="text-zinc-300 font-semibold">Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Detailed description shown in shop modal and card..."
                            className="bg-zinc-900 border-zinc-800 text-zinc-100 min-h-[80px] focus:border-emerald-500"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-zinc-300 font-semibold">Cost (Links)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              className="bg-zinc-900 border-zinc-800 text-cyan-400 font-mono font-bold focus:border-emerald-500"
                              {...field}
                            />
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
                          <FormLabel className="text-zinc-300 font-semibold">Sort Order Index</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono focus:border-emerald-500"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Status Switches */}
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="active"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
                            />
                          </FormControl>
                          <FormLabel className="text-xs font-semibold text-zinc-300 cursor-pointer">
                            Active in DB
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="forSale"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
                            />
                          </FormControl>
                          <FormLabel className="text-xs font-semibold text-zinc-300 cursor-pointer">
                            For Sale in Shop
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="premiumOnly"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-purple-500 focus:ring-purple-500/20"
                            />
                          </FormControl>
                          <FormLabel className="text-xs font-semibold text-zinc-300 cursor-pointer">
                            Pro Exclusive
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="featured"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500/20"
                            />
                          </FormControl>
                          <FormLabel className="text-xs font-semibold text-zinc-300 cursor-pointer">
                            Featured Item
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="requiresShipping"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0 col-span-2">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-blue-500 focus:ring-blue-500/20"
                            />
                          </FormControl>
                          <FormLabel className="text-xs font-semibold text-zinc-300 cursor-pointer">
                            Requires Physical Shipping Info (Merch)
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Asset Keys & Quick Selector */}
                  <div className="space-y-4 pt-2 border-t border-zinc-800">
                    {/* Quick Component Key Selection */}
                    {watchAll.type === 'PROFILE_BANNER' && (
                      <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-lg space-y-2">
                        <label className="text-xs font-bold text-cyan-400 block">
                          Select Registered Banner Component Key:
                        </label>
                        <select
                          className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-100 font-mono focus:border-emerald-500"
                          value={registeredBanners.includes(watchAll.image || '') ? watchAll.image : ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              form.setValue('image', e.target.value);
                            }
                          }}
                        >
                          <option value="">-- Choose registered banner key --</option>
                          {registeredBanners.map(key => (
                            <option key={key} value={key}>{key}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {watchAll.type === 'AVATAR_RING' && (
                      <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-lg space-y-2">
                        <label className="text-xs font-bold text-cyan-400 block">
                          Select Registered Avatar Ring Key:
                        </label>
                        <select
                          className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-100 font-mono focus:border-emerald-500"
                          value={registeredRings.includes(watchAll.image || '') ? watchAll.image : ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              form.setValue('image', e.target.value);
                            }
                          }}
                        >
                          <option value="">-- Choose registered ring key --</option>
                          {registeredRings.map(key => (
                            <option key={key} value={key}>{key}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {watchAll.type === 'TITLE' && (
                      <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-lg space-y-2">
                        <label className="text-xs font-bold text-cyan-400 block">
                          Select Registered Title Component Key:
                        </label>
                        <select
                          className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-100 font-mono focus:border-emerald-500"
                          value={registeredTitles.includes(watchAll.image || '') ? watchAll.image : ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              form.setValue('image', e.target.value);
                              form.setValue('preview', e.target.value);
                            }
                          }}
                        >
                          <option value="">-- Choose registered title key --</option>
                          {registeredTitles.map(key => (
                            <option key={key} value={key}>{key}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="image"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-zinc-300 font-semibold">
                            Component Key / Image URL / Class
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. EmeraldStormBanner, BullBearAvatarRing, V1OriginatorTitle, or gs://..."
                              className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-xs focus:border-emerald-500"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-zinc-500 text-xs">
                            Enter registered key, image URL, or CSS class.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="thumbnail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-zinc-300 font-semibold">
                            Static Thumbnail Image URL (Optional Override)
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. /images/merch/tee-black.jpg"
                              className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-xs focus:border-emerald-500"
                              {...field}
                            />
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
                          <FormLabel className="text-zinc-300 font-semibold">
                            Set / Collection ID Tag
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. opulento, inferno, ocean, xenon"
                              className="bg-zinc-900 border-zinc-800 text-cyan-400 font-mono text-xs focus:border-emerald-500"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-zinc-500 text-xs">
                            Used to group cosmetics together in set matching filters.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/admin/shopItems')}
                      className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold"
                    >
                      {isSubmitting ? "Updating..." : "Update Shop Item"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-6 space-y-4">
            <div className="flex items-center gap-2 text-zinc-200 font-bold text-sm">
              <Eye className="w-4 h-4 text-emerald-400" />
              Storefront Card Live Preview
            </div>
            {renderLivePreview()}
          </div>
        </div>
      </div>
    </div>
  );
}
