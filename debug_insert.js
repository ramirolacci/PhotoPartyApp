
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

async function debugInsertV2() {
    console.log('Testing INSERT on photos_v2...');
    const { data, error } = await supabase.from('photos_v2').insert({
        user_name: 'DebugV2',
        image_url: 'http://debug-v2.com',
        title: 'TestV2'
    }).select();

    if (error) {
        console.log('INSERT_ERROR_CODE:', error.code);
        console.log('INSERT_ERROR_MSG:', error.message);
    } else {
        console.log('✅ INSERT V2 SUCCESS!');
        // Clean up
        await supabase.from('photos_v2').delete().eq('id', data[0].id);
    }
}

debugInsertV2();
