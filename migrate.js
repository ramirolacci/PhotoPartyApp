import { supabase } from './src/lib/supabaseClient';

async function runMigration() {
    console.log('🚀 Running migration to make photos table public...\n');

    const migrations = [
        {
            name: 'Make user_id nullable',
            sql: 'ALTER TABLE photos ALTER COLUMN user_id DROP NOT NULL;'
        },
        {
            name: 'Drop old policies',
            sql: `
        DROP POLICY IF EXISTS "Users can view own photos" ON photos;
        DROP POLICY IF EXISTS "Users can insert own photos" ON photos;
        DROP POLICY IF EXISTS "Users can delete own photos" ON photos;
        DROP POLICY IF EXISTS "Users can update own photos" ON photos;
      `
        },
        {
            name: 'Create public view policy',
            sql: `
        CREATE POLICY "Anyone can view photos"
          ON photos FOR SELECT
          TO public
          USING (true);
      `
        },
        {
            name: 'Create public insert policy',
            sql: `
        CREATE POLICY "Anyone can insert photos"
          ON photos FOR INSERT
          TO public
          WITH CHECK (true);
      `
        },
        {
            name: 'Create public delete policy',
            sql: `
        CREATE POLICY "Anyone can delete photos"
          ON photos FOR DELETE
          TO public
          USING (true);
      `
        },
        {
            name: 'Create public update policy',
            sql: `
        CREATE POLICY "Anyone can update photos"
          ON photos FOR UPDATE
          TO public
          USING (true)
          WITH CHECK (true);
      `
        }
    ];

    for (const migration of migrations) {
        try {
            console.log(`⏳ ${migration.name}...`);
            const { error } = await supabase.rpc('exec_sql', { sql_query: migration.sql });

            if (error) {
                console.error(`❌ Error in ${migration.name}:`, error);
            } else {
                console.log(`✅ ${migration.name} - Success`);
            }
        } catch (err) {
            console.error(`❌ Exception in ${migration.name}:`, err);
        }
    }

    console.log('\n🎉 Migration completed! Try uploading a photo now.');
    process.exit(0);
}

runMigration();
