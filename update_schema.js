
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
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSchemaUpdate() {
    console.log('🚀 Running schema update for PhotoPartyApp...\n');

    // We try to add columns one by one using raw SQL via RPC if possible, 
    // or just hope the RPC 'exec_sql' exists (based on previous migrate.js).
    // The previous migrate.js SUGGESTED it exists.

    const sql = `
        DO $$ 
        BEGIN 
            -- Add image_url column if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'image_url') THEN
                ALTER TABLE photos ADD COLUMN image_url text;
            END IF;

            -- Add user_name column if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'user_name') THEN
                ALTER TABLE photos ADD COLUMN user_name text;
            END IF;
            
            -- Add user_id column if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'user_id') THEN
                ALTER TABLE photos ADD COLUMN user_id uuid;
            END IF;

             -- Make image_data nullable if it exists
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'image_data') THEN
                ALTER TABLE photos ALTER COLUMN image_data DROP NOT NULL;
            END IF;
        END $$;
    `;

    try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('❌ Error updating schema:', error);
        } else {
            console.log('✅ Schema update completed successfully');
        }
    } catch (err) {
        console.error('❌ Exception during schema update:', err);
    }

    console.log('\n🎉 Schema update process finished.');
    process.exit(0);
}

runSchemaUpdate();
