
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

async function debugTables() {
    console.log('🔍 Debugging Table Access...\n');

    // 1. Try selecting plain 'photos'
    console.log("1. SELECT * FROM photos");
    const { data, error } = await supabase.from('photos').select('*').limit(1);

    if (error) {
        console.log('❌ Error:', JSON.stringify(error, null, 2));
    } else {
        console.log('✅ Success! Data:', data);
    }

    // 2. Try inserting (to check RLS)
    console.log("\n2. INSERT into photos");
    const { error: insertError } = await supabase.from('photos').insert({
        user_name: 'Debug',
        image_url: 'http://debug.com'
    });
    if (insertError) {
        console.log('❌ Error:', JSON.stringify(insertError, null, 2));
    } else {
        console.log('✅ Success!');
    }
}

debugTables();
