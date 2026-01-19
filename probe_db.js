
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

async function probe() {
    console.log('🕵️ Probing photos table...');
    const { data, error } = await supabase.from('photos').select('*').limit(1);

    if (error) {
        console.error('Error selecting:', error);
    } else {
        console.log('Success. Data:', data);
        if (data.length > 0) {
            console.log('Columns detected:', Object.keys(data[0]));
        } else {
            console.log('Table exists but is empty. Cannot determine columns from data.');
            // Try inserting a dummy row with just default to see if it works, or try checking error on invalid column
        }
    }

    // Try to insert with user_name to see if it allows it or errors
    console.log('Attempting dry-run insert with new columns...');
    const { error: insertError } = await supabase.from('photos').insert({
        image_url: 'http://test.com',
        user_name: 'Probe',
        image_data: null // Assuming we might need to satisfy not null if it exists, but let's see
    }).select(); // use select to get returned data

    if (insertError) {
        console.log('Insert failed (expected if columns missing):', insertError.message);
    } else {
        console.log('Insert SUCCEEDED! Columns exist.');
        // Clean up
        // await supabase.from('photos').delete().eq('user_name', 'Probe');
    }
}

probe();
