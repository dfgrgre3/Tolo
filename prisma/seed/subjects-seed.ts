import { PrismaClient, Level } from '@prisma/client'

const prisma = new PrismaClient()

const subjects = [
    {
        id: 'MATH',
        name: 'Mathematics',
        nameAr: 'ط§ظ„ط±ظٹط§ط¶ظٹط§طھ',
        type: 'MATH',
        categoryId: 'MATH',
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
        id: 'PHYSICS',
        name: 'Physics',
        nameAr: 'ط§ظ„ظپظٹط²ظٹط§ط،',
        type: 'PHYSICS',
        categoryId: 'PHYSICS',
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
        id: 'CHEMISTRY',
        name: 'Chemistry',
        nameAr: 'ط§ظ„ظƒظٹظ…ظٹط§ط،',
        type: 'CHEMISTRY',
        categoryId: 'CHEMISTRY',
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
        id: 'ARABIC',
        name: 'Arabic',
        nameAr: 'ط§ظ„ظ„ط؛ط© ط§ظ„ط¹ط±ط¨ظٹط©',
        type: 'ARABIC',
        categoryId: 'ARABIC',
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
        id: 'ENGLISH',
        name: 'English',
        nameAr: 'ط§ظ„ظ„ط؛ط© ط§ظ„ط¥ظ†ط¬ظ„ظٹط²ظٹط©',
        type: 'ENGLISH',
        categoryId: 'ENGLISH',
        code: 'ENGL101',
        description: 'طھط·ظˆظٹط± mظ‡ط§ط±ط§طھ ط§ظ„ظ„ط؛ط© ط§ظ„ط¥ظ†ط¬ظ„ظٹط²ظٹط©طŒ ط§ظ„ظ‚ظˆط§ط¹ط¯طŒ ط§ظ„ظƒظ„ظ…ط§طھطŒ ظˆط§ظ„طھط±ط¬ظ…ط© ظ„ظ„ظ…ط±ط­ظ„ط© ط§ظ„ط«ط§ظ†ظˆظٹط©.',
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
    },
    {
        id: 'SCIENCE',
        name: 'Science',
        nameAr: 'ط§ظ„ط¹ظ„ظˆظ…',
        type: 'SCIENCE',
        categoryId: 'SCIENCE',
        code: 'SCI101',
        description: 'ط´ط±ط­ ظ…ط¨ط³ط· ظ„ظ…ط¨ط§ط¯ط¦ ط§ظ„ط¹ظ„ظˆظ… ط§ظ„ط¹ط§ظ…ط©.',
        color: '#06b6d4',
        icon: 'Beaker',
        price: 100,
        rating: 4.5,
        instructorName: 'ط£/ ظ…ط­ظ…ظˆط¯ ظƒط§ظ…ظ„',
        level: Level.BEGINNER,
        durationHours: 25,
        thumbnailUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=2070&auto=format&fit=crop',
        enrolledCount: 500,
        isActive: true
    },
    {
        id: 'SOCIAL_STUDIES',
        name: 'Social Studies',
        nameAr: 'ط§ظ„ط¯ط±ط§ط³ط§طھ ط§ظ„ط§ط¬طھظ…ط§ط¹ظٹط©',
        type: 'SOCIAL',
        categoryId: 'SOCIAL_STUDIES',
        code: 'SOC101',
        description: 'طھط§ط±ظٹط® ظˆط¬ط؛ط±ط§ظپظٹط§ ظ„ظ„ظ…ط±ط­ظ„ط© ط§ظ„ط«ط§ظ†ظˆظٹط©.',
        color: '#84cc16',
        icon: 'Globe',
        price: 110,
        rating: 4.4,
        instructorName: 'ط£/ ظ‡ط§ظ†ظٹ ظٹظˆط³ظپ',
        level: Level.INTERMEDIATE,
        durationHours: 28,
        thumbnailUrl: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?q=80&w=1974&auto=format&fit=crop',
        enrolledCount: 600,
        isActive: true
    }
]

async function seedSubjectsData() {
    console.log('Seeding subjects...')

    for (const subject of subjects) {
        try {
            await prisma.subject.upsert({
                where: { id: subject.id },
                update: subject,
                create: subject
            })
        } catch (err: any) {
            console.error(`- Failed to seed ${subject.nameAr}: `, err.message)
        }
    }

    console.log('âœ“ Subjects seeded successfully.')
}

export default seedSubjectsData;
