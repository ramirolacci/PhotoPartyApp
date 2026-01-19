
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const parseEnv = (content) => {
    const env = {};
    const lines = content.split('\n');
    for (const line of lines) {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            env[match[1].trim()] = match[2].trim();
        }
    }
    return env;
};

const env = parseEnv(envContent);
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function probeStorage() {
    console.log('--- Probing Storage "photos" ---');

    const fileName = `probe-${Date.now()}.txt`;
    const fileBody = 'Hello Storage';

    // 1. Test Upload
    console.log(`1. Uploading ${fileName}...`);
    const { data, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, fileBody, {
            contentType: 'text/plain',
            upsert: false
        });

    if (uploadError) {
        console.log('❌ Upload FAILED:', uploadError.message);
        console.log('Details:', uploadError);
        return;
    }
    console.log('✅ Upload SUCCESS:', data.path);

    // 2. Test Public URL
    const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

    console.log('Public URL:', publicUrl);

    // 3. Test Delete (Cleanup)
    console.log('3. Deleting file...');
    const { error: deleteError } = await supabase.storage
        .from('photos')
        .remove([fileName]);

    if (deleteError) {
        console.log('⚠️ Delete failed:', deleteError.message);
    } else {
        console.log('✅ Cleanup SUCCESS');
    }
}

probeStorage();
