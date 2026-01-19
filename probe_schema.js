
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

async function probeSchema() {
    console.log('--- Probing Schema ---');

    // Test 1: Empty insert (expect Not Null violation, revealing a required column)
    console.log('1. Inserting empty object...');
    const { error: err1 } = await supabase.from('photos').insert({});
    if (err1) console.log('Err1:', err1.code, err1.message);

    // Test 2: Insert with 'userName' (camelCase)
    console.log('2. Inserting { userName: "test" }...');
    const { error: err2 } = await supabase.from('photos').insert({ userName: 'test' });
    if (err2) console.log('Err2:', err2.code, err2.message);

    // Test 3: Insert with 'user_name' (snake_case)
    console.log('3. Inserting { user_name: "test" }...');
    const { error: err3 } = await supabase.from('photos').insert({ user_name: 'test' });
    if (err3) console.log('Err3:', err3.code, err3.message);
}

probeSchema();
