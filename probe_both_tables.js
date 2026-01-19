
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

async function probeBoth() {
    console.log('🕵️ checking connectivity for BOTH tables...\n');

    // Check photos
    console.log('--- Checking "photos" ---');
    const { data: data1, error: error1 } = await supabase.from('photos').select('*').limit(1);
    if (error1) {
        console.log('❌ photos ERROR:', error1.code, error1.message);
        if (error1.hint) console.log('   Hint:', error1.hint);
    } else {
        console.log('✅ photos SUCCESS! (Data length:', data1.length, ')');
    }

    // Check photos_v2
    console.log('\n--- Checking "photos_v2" ---');
    const { data: data2, error: error2 } = await supabase.from('photos_v2').select('*').limit(1);
    if (error2) {
        console.log('❌ photos_v2 ERROR:', error2.code, error2.message);
        if (error2.hint) console.log('   Hint:', error2.hint);
    } else {
        console.log('✅ photos_v2 SUCCESS! (Data length:', data2.length, ')');
    }
}

probeBoth();
