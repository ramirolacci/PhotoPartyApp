import { supabase } from './supabaseClient';
import type { Photo } from '../types/Photo';
import { base64ToBlob } from './imageOptimization';

function logToConsole(msg: string, isError = false) {
  const consoleEl = document.getElementById('debug-console');
  if (consoleEl) {
    const div = document.createElement('div');
    div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    if (isError) div.style.color = '#ff6b6b';
    consoleEl.appendChild(div);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }
  if (isError) console.error(msg);
  else console.log(msg);
}

export async function savePhoto(
  imageBase64: string,
  userName: string,
  title?: string
): Promise<Photo | null> {
  logToConsole(`Starting savePhoto for user: ${userName}`);
  try {
    // 1. Convert base64 to blob
    logToConsole('1. Converting base64 to blob...');
    const blob = base64ToBlob(imageBase64);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    logToConsole(`   Blob size: ${blob.size} bytes. Filename: ${fileName}`);

    // 2. Upload to Supabase Storage
    logToConsole('2. Uploading to Supabase Storage...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      logToConsole(`❌ Error uploading photo: ${uploadError.message}`, true);
      // Si el bucket no existe o falla config, no seguimos
      throw uploadError;
    }
    logToConsole('✅ Upload success.');

    // 3. Get Public URL
    logToConsole('3. Getting Public URL...');
    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName);
    logToConsole(`   URL: ${publicUrl}`);

    // 4. Save metadata to Database
    logToConsole('4. Saving metadata to Database...');
    const { data: insertedPhoto, error: insertError } = await supabase
      .from('photos')
      .insert({
        image_url: publicUrl,
        user_name: userName,
        title: title || null,
      })
      .select()
      .single();

    if (insertError) {
      logToConsole(`❌ Error INSERT DB: ${insertError.message} - Code: ${insertError.code}`, true);
      // Optional: Cleanup uploaded file if metadata save fails
      // await supabase.storage.from('photos').remove([fileName]); 
      throw insertError;
    }

    logToConsole(`✅ Database Insert Success. ID: ${insertedPhoto.id}`);

    // 5. Return mapped object
    return {
      id: insertedPhoto.id,
      imageUrl: insertedPhoto.image_url,
      userName: insertedPhoto.user_name,
      title: insertedPhoto.title || undefined,
      createdAt: new Date(insertedPhoto.created_at),
    };

  } catch (err) {
    console.error('Error in savePhoto:', err);
    alert(`Error detallado al guardar: ${err instanceof Error ? err.message : JSON.stringify(err)}`);
    return null;
  }
}

export async function getPhotos(): Promise<Photo[]> {
  try {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching photos:', error);
      throw error;
    }

    return data.map((p) => ({
      id: p.id,
      imageUrl: p.image_url,
      userName: p.user_name,
      title: p.title || undefined,
      createdAt: new Date(p.created_at),
    }));
  } catch (err) {
    console.error('Error in getPhotos:', err);
    return [];
  }
}

export async function deletePhoto(id: string): Promise<boolean> {
  try {
    // 1. Get the photo URL to extract filename
    const { data: photo, error: fetchError } = await supabase
      .from('photos')
      .select('image_url')
      .eq('id', id)
      .single();

    if (fetchError || !photo) {
      console.error('Photo not found for deletion:', id);
      return false;
    }

    // Extract filename from URL
    const parts = photo.image_url.split('/');
    const fileName = parts[parts.length - 1];

    if (fileName) {
      // 2. Delete from Storage
      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove([fileName]);

      if (storageError) {
        console.warn('Could not delete file from storage:', storageError);
      }
    }

    // 3. Delete from Database
    const { error: dbError } = await supabase
      .from('photos')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error('Error deleting photo from DB:', dbError);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in deletePhoto:', err);
    return false;
  }
}

export async function updatePhotoTitle(id: string, title: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('photos')
      .update({ title: title || null })
      .eq('id', id);

    if (error) {
      console.error('Error updating title:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error in updatePhotoTitle:', err);
    return false;
  }
}
