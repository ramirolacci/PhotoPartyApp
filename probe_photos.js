
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

async function probePhotos() {
    console.log('Testing "photos" table...');
    const { data, error } = await supabase.from('photos').select('*').limit(1);

    if (error) {
        console.log('FAIL:', error.code, error.message);
    } else {
        console.log('SUCCESS! Table "photos" is accessible.');
        if (data && data.length > 0) {
            console.log('Row keys:', Object.keys(data[0]));
        } else {
            console.log('Table is empty, cannot verify columns.');
        }
    }
}

probePhotos();
