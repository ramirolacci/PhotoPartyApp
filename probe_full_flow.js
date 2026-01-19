
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read .env file manually
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

async function probeFullFlow() {
    console.log('🔄 Probing Database Full Flow (Insert + Select)...\n');

    const testUrl = 'https://placehold.co/600x400';
    const testUser = 'ProbeUser';

    // 1. Try INSERT
    console.log('1️⃣ Attempting INSERT into photos table...');
    const { data: inserted, error: insertError } = await supabase
        .from('photos')
        .insert({
            image_url: testUrl,
            user_name: testUser,
            title: 'DB Probe Test'
        })
        .select()
        .single();

    if (insertError) {
        console.error('❌ Insert failed:', insertError.message);
        console.error('Hint: Check RLS policies on "photos" table.');
        return;
    }
    console.log('✅ Insert success:', inserted.id);

    // 2. Try SELECT (getPhotos logic)
    console.log('\n2️⃣ Attempting SELECT (reading back)...');
    const { data: list, error: selectError } = await supabase
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false });

    if (selectError) {
        console.error('❌ Select failed:', selectError.message);
        return;
    }

    // Find our inserted photo
    const found = list.find(p => p.id === inserted.id);
    if (found) {
        console.log('✅ Select success. Found the inserted photo.');
        console.log('   Stats: Total photos in DB:', list.length);
        console.log('   Data:', found);
    } else {
        console.error('❌ Select success (no error), BUT could not find the inserted photo.');
        console.error('   This implies RLS Select policy might be hiding rows?');
    }

    // 3. Clean up
    console.log('\n3️⃣ Cleaning up (Delete)...');
    const { error: deleteError } = await supabase
        .from('photos')
        .delete()
        .eq('id', inserted.id);

    if (deleteError) {
        console.error('⚠️ Delete failed:', deleteError.message);
    } else {
        console.log('✅ Cleanup success.');
    }
}

probeFullFlow();
