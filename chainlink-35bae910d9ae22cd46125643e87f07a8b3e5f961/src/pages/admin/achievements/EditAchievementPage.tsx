import React from 'react';
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';
import { db, app } from '../../../lib/firebase';
import { useNavigate, useParams } from 'react-router-dom';
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
import { achievementTypes } from './CreateAchievementPage';

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  type: z.enum(achievementTypes),
  weight: z.coerce.number().min(0, "Weight must be a positive number"),
  threshold: z.coerce.number().min(0, "Threshold must be a positive number"),
  links: z.coerce.number().min(0, "Reward must be a positive number"),
  image: z.string().optional()
});

export default function EditAchievementPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      type: "OTHER",
      weight: 0,
      threshold: 0,
      links: 0,
      image: undefined
    },
  });

  useEffect(() => {
    const fetchAchievement = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "achievements", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          form.reset({
            name: data.name || "",
            description: data.description || "",
            type: data.type || "OTHER",
            weight: data.weight || 0,
            threshold: data.threshold || 0,
            links: data.links || 0,
            image: data.image || undefined
          });
        }
      } catch (error) {
        console.error("Error fetching achievement:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAchievement();
  }, [id, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "achievements", id), {
        ...values,
        updatedAt: Date.now()
      });
      navigate("/admin/achievements");
    } catch (error) {
      console.error("Error updating achievement:", error);
      alert("Failed to update achievement");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading achievement...</div>;

  return (
    <div className="m-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="outline" onClick={() => navigate('/admin/achievements')}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-zinc-50">Edit Achievement</h1>
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
                    <FormDescription>
                      This is the name of the achievement that will be displayed
                    </FormDescription>
                    <FormControl>
                      <Input placeholder="Achievement Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormDescription>
                      Use OTHER for manually assigned achievements.
                    </FormDescription>
                    <FormControl>
                      <Select
                        onChange={field.onChange}
                        value={field.value}
                      >
                        <option value="" disabled>Select achievement type</option>
                        {achievementTypes.map((type) => (
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormDescription>
                      This is the description of the achievement that will be
                      displayed
                    </FormDescription>
                    <FormControl>
                      <Textarea placeholder="Description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight</FormLabel>
                    <FormDescription>
                      This is the weight of the achievement that will be used to
                      determine the order of the achievements on the profile.
                    </FormDescription>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Threshold</FormLabel>
                    <FormDescription>
                      The threshold is the number required to be met to award the
                      achievement for the given type.
                    </FormDescription>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="links"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>🔗Reward</FormLabel>
                    <FormDescription>
                      This amount will be rewarded on achievement completion.
                    </FormDescription>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL (Optional)</FormLabel>
                    <FormDescription>
                      External URL for the achievement image or upload a file
                    </FormDescription>
                    <div className="flex gap-2">
                      <FormControl className="flex-1">
                        <Input type="text" placeholder="https://example.com/image.png" {...field} />
                      </FormControl>
                      <Input
                        type="file"
                        accept="image/*"
                        className="w-auto"
                        disabled={isUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          setIsUploading(true);
                          try {
                            const fileRef = ref(getStorage(app), `Achievements/${Date.now()}_${file.name}`);
                            await uploadBytes(fileRef, file);
                            const downloadUrl = await getDownloadURL(fileRef);
                            form.setValue("image", downloadUrl, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                          } catch (error) {
                            console.error("Error uploading image:", error);
                            alert("Failed to upload image");
                          } finally {
                            setIsUploading(false);
                          }
                        }}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Achievement"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
