
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

async function checkColumn(colName) {
    const { error } = await supabase.from('photos').select(colName).limit(1);
    if (error) {
        console.log(`[fail] ${colName}`);
        return false;
    } else {
        console.log(`[ok] ${colName}`);
        return true;
    }
}

async function probeUserCol() {
    console.log('--- Probing User Column ---');
    await checkColumn('user');
    await checkColumn('name');
    await checkColumn('author');
    await checkColumn('owner');
    await checkColumn('userId');
    await checkColumn('user_id');
    await checkColumn('created_by');
}

probeUserCol();
