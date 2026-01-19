
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

async function probeInsert() {
    console.log('Testing INSERT into "photos"...');
    const { data, error } = await supabase.from('photos').insert({
        user_name: 'NodeProbe',
        image_url: 'http://probe.com/img.jpg',
        title: 'Insert Probe'
    }).select();

    if (error) {
        console.log('❌ INSERT FAILED:', error.code, error.message);
    } else {
        console.log('✅ INSERT SUCCESS! ID:', data[0].id);
        // cleanup
        await supabase.from('photos').delete().eq('id', data[0].id);
    }
}

probeInsert();
