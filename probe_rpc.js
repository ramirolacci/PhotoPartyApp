
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

async function probeRPC() {
    console.log('Testing RPC "insert_photo"...');

    const { data: newId, error } = await supabase.rpc('insert_photo', {
        p_image_url: 'http://rpc-test.com/img.jpg',
        p_user_name: 'RpcProbe',
        p_title: 'RPC Check'
    });

    if (error) {
        console.log('❌ RPC FAILED:', error.code, error.message);
        console.log('Details:', error.details);
    } else {
        console.log('✅ RPC SUCCESS! Returned ID:', newId);

        // Verify we can read it back
        const { data: readBack, error: readError } = await supabase
            .from('photos')
            .select('*')
            .eq('id', newId)
            .single();

        if (readError) {
            console.log('⚠️ RPC worked but SELECT failed:', readError.message);
        } else {
            console.log('✅ Read verification passed:', readBack.id);

            // Cleanup
            await supabase.from('photos').delete().eq('id', newId);
        }
    }
}

probeRPC();
