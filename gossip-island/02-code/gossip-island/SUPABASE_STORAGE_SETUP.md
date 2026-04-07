# Supabase Storage Setup for Photo Gallery

## Problem
Photo uploads are failing because the Supabase storage bucket doesn't exist yet.

## Solution
Create the storage bucket in your Supabase project:

### Step 1: Create Storage Bucket

1. Go to: https://supabase.com/dashboard/project/vevhyqcxnwmqnzowvtiy/storage/buckets

2. Click **"New Bucket"**

3. Configure the bucket:
   - **Name:** `public-photos`
   - **Public:** No (keep private)
   - **File size limit:** 5 MB (or your preference)
   - **Allowed MIME types:** `image/jpeg, image/png, image/gif, image/webp`

4. Click **"Create Bucket"**

### Step 2: Set Bucket Policies

After creating the bucket, set up RLS policies:

1. Click on the `public-photos` bucket
2. Go to **"Policies"** tab
3. Click **"New Policy"**

**Policy 1: Allow authenticated users to upload**
```sql
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public-photos');
```

**Policy 2: Allow authenticated users to read**
```sql
CREATE POLICY "Authenticated users can view photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'public-photos');
```

**Policy 3: Allow users to delete their own photos (or admin)**
```sql
CREATE POLICY "Users can delete own photos or admin deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'public-photos' AND
  (
    auth.uid() = owner OR
    auth.jwt() ->> 'role' = 'service_role'
  )
);
```

### Step 3: Test Upload

1. Go to: https://www.gossipisland.com/members/gallery
2. Click on an album
3. Try uploading a photo
4. Should work now!

---

## Alternative: Create Bucket via SQL

If you prefer SQL, run this in the Supabase SQL Editor:

```sql
-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-photos',
  'public-photos',
  false,
  5242880,  -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);
```

Then add the policies using the SQL statements above.

---

## Troubleshooting

**"Bucket not found" error:**
- Verify bucket name is exactly `public-photos`
- Check bucket was created successfully in Storage dashboard

**"Permission denied" error:**
- Check RLS policies are enabled
- Verify your API key has correct permissions
- Try using service_role key for testing

**Upload works but can't view photos:**
- Check the "read" policy is enabled
- Verify signed URL generation is working
