import { prisma } from '../src/lib/db'
import { Level } from '@prisma/client'

const subjects = [
    {
        id: 'math-course',
        name: 'Mathematics',
        nameAr: 'ط§ظ„ط±ظٹط§ط¶ظٹط§طھ',
        type: 'MATH',
        code: 'MATH101',
        description: 'ط´ط±ط­ ظ…طھظƒط§ظ…ظ„ ظ„ظ…ظ†ظ‡ط¬ ط§ظ„ط±ظٹط§ط¶ظٹط§طھ ظ„ظ„ظ…ط±ط­ظ„ط© ط§ظ„ط«ط§ظ†ظˆظٹط©طŒ ظٹط؛ط·ظٹ ط§ظ„ط¬ط¨ط± ظˆط­ط³ط§ط¨ ط§ظ„ظ…ط«ظ„ط«ط§طھ ظˆط§ظ„طھظپط§ط¶ظ„ ظˆط§ظ„طھظƒط§ظ…ظ„.',
        color: '#3b82f6',
        icon: 'Calculator',
        price: 150,
        rating: 4.8,
        instructorName: 'ط£/ ظ…ط­ظ…ط¯ ط¹ظ„ظٹ',
        level: Level.INTERMEDIATE,
        durationHours: 40,
        thumbnailUrl: 'https://images.unsplash.com/photo-1509228468518-180dd48a5793?q=80&w=2070&auto=format&fit=crop',
        enrolledCount: 1250,
        isActive: true
    },
    {
        id: 'physics-course',
        name: 'Physics',
        nameAr: 'ط§ظ„ظپظٹط²ظٹط§ط،',
        type: 'PHYSICS',
        code: 'PHYS101',
        description: 'ط¯ظˆط±ط© ط´ط§ظ…ظ„ط© ظپظٹ ط§ظ„ظپظٹط²ظٹط§ط، طھط؛ط·ظٹ ط§ظ„ظ…ظٹظƒط§ظ†ظٹظƒط§طŒ ط§ظ„ط¶ظˆط،طŒ ط§ظ„ظƒظ‡ط±ط¨ط§ط،طŒ ظˆط§ظ„ظپظٹط²ظٹط§ط، ط§ظ„ط­ط¯ظٹط«ط© ط¨ط£ط³ظ„ظˆط¨ ظ…ط¨ط³ط·.',
        color: '#ef4444',
        icon: 'Zap',
        price: 180,
        rating: 4.9,
        instructorName: 'ط£/ ط£ط­ظ…ط¯ ط­ط³ظ†',
        level: Level.ADVANCED,
        durationHours: 45,
        thumbnailUrl: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?q=80&w=2070&auto=format&fit=crop',
        enrolledCount: 980,
        isActive: true
    },
    {
        id: 'chemistry-course',
        name: 'Chemistry',
        nameAr: 'ط§ظ„ظƒظٹظ…ظٹط§ط،',
        type: 'CHEMISTRY',
        code: 'CHEM101',
        description: 'طھط¹ظ„ظ… ط§ظ„ظƒظٹظ…ظٹط§ط، ط§ظ„ط¹ط¶ظˆظٹط© ظˆط؛ظٹط± ط§ظ„ط¹ط¶ظˆظٹط©طŒ ظ…ط¹ طھط¬ط§ط±ط¨ ط¹ظ…ظ„ظٹط© ظ…ط³ط¬ظ„ط© ظˆظپظ‡ظ… ط¹ظ…ظٹظ‚ ظ„ظ„ط±ظˆط§ط¨ط· ظˆط§ظ„ظ…ظپط§ط¹ظ„ط§طھ.',
        color: '#10b981',
        icon: 'FlaskConical',
        price: 160,
        rating: 4.7,
        instructorName: 'ط¯/ ط³ط§ط±ط© ظ…ط­ظ…ظˆط¯',
        level: Level.INTERMEDIATE,
        durationHours: 38,
        thumbnailUrl: 'https://images.unsplash.com/photo-1532187863486-abf9d3a4461a?q=80&w=2070&auto=format&fit=crop',
        enrolledCount: 850,
        isActive: true
    },
    {
        id: 'arabic-course',
        name: 'Arabic',
        nameAr: 'ط§ظ„ظ„ط؛ط© ط§ظ„ط¹ط±ط¨ظٹط©',
        type: 'ARABIC',
        code: 'ARAB101',
        description: 'ط¥طھظ‚ط§ظ† ط§ظ„ظ„ط؛ط© ط§ظ„ط¹ط±ط¨ظٹط©طŒ ط§ظ„ظ†ط­ظˆطŒ ط§ظ„ط¨ظ„ط§ط؛ط©طŒ ظˆط§ظ„ط£ط¯ط¨ ط¨ط£ط³ظ„ظˆط¨ ط´ظٹظ‚ ظٹط¶ظ…ظ† ط§ظ„ط¯ط±ط¬ط§طھ ط§ظ„ظ†ظ‡ط§ط¦ظٹط©.',
        color: '#f59e0b',
        icon: 'BookOpen',
        price: 120,
        rating: 4.9,
        instructorName: 'ط£/ ظ…طµط·ظپظ‰ ط³ط¹ظٹط¯',
        level: Level.BEGINNER,
        durationHours: 30,
        thumbnailUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=1974&auto=format&fit=crop',
        enrolledCount: 2100,
        isActive: true
    },
    {
        id: 'english-course',
        name: 'English',
        nameAr: 'ط§ظ„ظ„ط؛ط© ط§ظ„ط¥ظ†ط¬ظ„ظٹط²ظٹط©',
        type: 'ENGLISH',
        code: 'ENGL101',
        description: 'طھط·ظˆظٹط± ظ…ظ‡ط§ط±ط§طھ ط§ظ„ظ„ط؛ط© ط§ظ„ط¥ظ†ط¬ظ„ظٹط²ظٹط©طŒ ط§ظ„ظ‚ظˆط§ط¹ط¯طŒ ط§ظ„ظƒظ„ظ…ط§طھطŒ ظˆط§ظ„طھط±ط¬ظ…ط© ظ„ظ„ظ…ط±ط­ظ„ط© ط§ظ„ط«ط§ظ†ظˆظٹط©.',
        color: '#8b5cf6',
        icon: 'Languages',
        price: 140,
        rating: 4.6,
        instructorName: 'Mrs. Jane Doe',
        level: Level.INTERMEDIATE,
        durationHours: 35,
        thumbnailUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=1973&auto=format&fit=crop',
        enrolledCount: 1550,
        isActive: true
    }
]

async function main() {
    console.log('Seeding subjects into PostgreSQL...')

    for (const subject of subjects) {
        try {
            await prisma.subject.upsert({
                where: { id: subject.id },
                update: subject,
                create: subject
            })
            console.log(`- Seeded ${subject.nameAr} `)
        } catch (err: any) {
            console.error(`- Failed to seed ${subject.nameAr}: `, err.message)
        }
    }

    console.log('Seed completed.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
