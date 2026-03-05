/**
 * cleanup-sessions.mjs
 * 
 * Script لتنظيف الجلسات القديمة الملغاة ومنتهية الصلاحية من قاعدة البيانات.
 * 
 * تشغيل:
 *   node scripts/cleanup-sessions.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupSessions() {
    console.log('🧹 بدء تنظيف الجلسات القديمة...\n');

    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 1. إحصاء قبل التنظيف
    const beforeCount = await prisma.session.count();
    const activeCount = await prisma.session.count({ where: { isActive: true, expiresAt: { gt: now } } });
    const expiredCount = await prisma.session.count({ where: { expiresAt: { lt: now } } });
    const revokedOldCount = await prisma.session.count({
        where: { isActive: false, updatedAt: { lt: thirtyDaysAgo } }
    });

    console.log(`📊 الإحصاءات قبل التنظيف:`);
    console.log(`   إجمالي الجلسات:          ${beforeCount}`);
    console.log(`   جلسات نشطة وصالحة:       ${activeCount}`);
    console.log(`   جلسات منتهية الصلاحية:   ${expiredCount}`);
    console.log(`   جلسات ملغاة قديمة (+30d): ${revokedOldCount}`);
    console.log('');

    // 2. حذف الجلسات المنتهية الصلاحية
    const expiredDeleted = await prisma.session.deleteMany({
        where: { expiresAt: { lt: now } }
    });

    // 3. حذف الجلسات الملغاة (isActive=false) التي مضى عليها أكثر من 30 يوم
    const revokedDeleted = await prisma.session.deleteMany({
        where: {
            isActive: false,
            updatedAt: { lt: thirtyDaysAgo }
        }
    });

    // 4. إحصاء بعد التنظيف
    const afterCount = await prisma.session.count();

    console.log(`✅ نتائج التنظيف:`);
    console.log(`   جلسات منتهية محذوفة:     ${expiredDeleted.count}`);
    console.log(`   جلسات ملغاة قديمة محذوفة: ${revokedDeleted.count}`);
    console.log(`   ─────────────────────────────`);
    console.log(`   إجمالي المحذوف:           ${expiredDeleted.count + revokedDeleted.count}`);
    console.log(`   جلسات متبقية:             ${afterCount}`);
    console.log('');
    console.log('🎉 تم التنظيف بنجاح!');
}

cleanupSessions()
    .catch((e) => {
        console.error('❌ خطأ أثناء التنظيف:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
