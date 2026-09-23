import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://czryzqrxxfwthmzwpeah.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_7gjqAKcwUvchmm6MYJqWUg_ak9re_pg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('🚀 Meglévő Győri Skatemap fotók optimalizálásának indítása...\n');

  // Optionális admin bejelentkezés ha környezeti változóban meg van adva
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    console.log(`🔐 Bejelentkezés mint admin (${adminEmail})...`);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });
    if (authError) {
      console.warn('⚠️ Bejelentkezési hiba:', authError.message);
    } else {
      console.log('✅ Sikeres admin hitelesítés.');
    }
  }

  const { data: spots, error } = await supabase.from('spots').select('*');
  if (error) {
    console.error('❌ Hiba a spotok lekérdezésekor:', error.message);
    return;
  }

  console.log(`📋 ${spots.length} spot beolvasva az adatbázisból.\n`);

  let totalOptimized = 0;
  let totalBytesSaved = 0;

  for (const spot of spots) {
    if (!spot.images || !Array.isArray(spot.images) || spot.images.length === 0) continue;

    const updatedImages = [];
    let updatedNeeded = false;
    const spotName = spot.title || spot.name || 'Névtelen spot';

    for (let idx = 0; idx < spot.images.length; idx++) {
      const url = spot.images[idx];

      if (typeof url !== 'string') continue;

      if (url.endsWith('.webp')) {
        updatedImages.push(url);
        continue;
      }

      console.log(`📸 Tömörítés: [${spotName}] -> ${url}`);

      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.error(`   ❌ Nem sikerült letölteni (${res.status}): ${url}`);
          updatedImages.push(url);
          continue;
        }

        const arrayBuffer = await res.arrayBuffer();
        const inputBuffer = Buffer.from(arrayBuffer);
        const originalSize = inputBuffer.length;

        // Sharp átméretezés (max 1600x1600 aránytartással) és WebP tömörítés (80% minőség)
        const outputBuffer = await sharp(inputBuffer)
          .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();

        const compressedSize = outputBuffer.length;
        const savedBytes = originalSize - compressedSize;
        totalBytesSaved += Math.max(0, savedBytes);

        // Feltöltés a Supabase Storage-ba
        const newFileName = `spots/node-opt-${Date.now()}-${idx}.webp`;
        const { error: uploadError } = await supabase.storage
          .from('spot-images')
          .upload(newFileName, outputBuffer, {
            contentType: 'image/webp',
            cacheControl: '31536000',
            upsert: false,
          });

        if (uploadError) {
          console.error('   ❌ Feltöltési hiba:', uploadError.message);
          updatedImages.push(url);
          continue;
        }

        const { data: publicData } = supabase.storage
          .from('spot-images')
          .getPublicUrl(newFileName);

        updatedImages.push(publicData.publicUrl);
        updatedNeeded = true;
        totalOptimized++;

        // Régi fájl törlése a storage-ból ha spot-images-ben van
        const oldPathMatch = url.match(/spot-images\/(.+)$/);
        if (oldPathMatch && oldPathMatch[1]) {
          const { error: delError } = await supabase.storage
            .from('spot-images')
            .remove([oldPathMatch[1]]);
          if (delError) {
            console.warn('   ⚠️ Régi fájl törlési hiba:', delError.message);
          } else {
            console.log(`   🗑️ Régi fájl törölve a tárhelyről: ${oldPathMatch[1]}`);
          }
        }

        const reduction = Math.round((savedBytes / originalSize) * 100);
        console.log(`   ✅ Kész: ${(originalSize / 1024).toFixed(1)} KB -> ${(compressedSize / 1024).toFixed(1)} KB (-${reduction}%)`);
      } catch (err) {
        console.error('   ❌ Hiba a kép feldolgozásakor:', err.message);
        updatedImages.push(url);
      }
    }

    if (updatedNeeded) {
      const { error: updateError } = await supabase
        .from('spots')
        .update({ images: updatedImages, updated_at: new Date().toISOString() })
        .eq('id', spot.id);

      if (updateError) {
        console.warn(`   ⚠️ Spot adatbázis frissítés hiba (${spot.id}):`, updateError.message);
      } else {
        console.log(`   💾 Spot képlistája frissítve az adatbázisban.`);
      }
    }
  }

  console.log(`\n🎉 KÉSZ! ${totalOptimized} kép optimalizálva.`);
  console.log(`💾 Összesen megtakarított tárhely: ${(totalBytesSaved / (1024 * 1024)).toFixed(2)} MB`);
}

main().catch(console.error);
