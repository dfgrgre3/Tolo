import { PrismaClient, Difficulty } from '@prisma/client'

const prisma = new PrismaClient()

const subjects = [
    {
        id: 'MATH',
        name: 'Mathematics',
        nameAr: 'الرياضيات',
        type: 'MATH',
        categoryId: 'MATH',
        code: 'MATH101',
        description: 'شرح متكامل لمنهج الرياضيات للمرحلة الثانوية، يغطي الجبر وحساب المثلثات والتفاضل والتكامل.',
        color: '#3b82f6',
        icon: 'Calculator',
        price: 150,
        rating: 4.8,
        instructorName: 'أ/ محمد علي',
        level: Difficulty.MEDIUM,
        durationHours: 40,
        thumbnailUrl: 'https://images.unsplash.com/photo-1509228468518-180dd48a5793?q=80&w=2070&auto=format&fit=crop',
        enrolledCount: 1250,
        isActive: true
    },
    {
        id: 'PHYSICS',
        name: 'Physics',
        nameAr: 'الفيزياء',
        type: 'PHYSICS',
        categoryId: 'PHYSICS',
        code: 'PHYS101',
        description: 'دورة شاملة في الفيزياء تغطي الميكانيكا، الضوء، الكهرباء، والفيزياء الحديثة بأسلوب مبسط.',
        color: '#ef4444',
        icon: 'Zap',
        price: 180,
        rating: 4.9,
        instructorName: 'أ/ أحمد حسن',
        level: Difficulty.HARD,
        durationHours: 45,
        thumbnailUrl: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?q=80&w=2070&auto=format&fit=crop',
        enrolledCount: 980,
        isActive: true
    },
    {
        id: 'CHEMISTRY',
        name: 'Chemistry',
        nameAr: 'الكيمياء',
        type: 'CHEMISTRY',
        categoryId: 'CHEMISTRY',
        code: 'CHEM101',
        description: 'تعلم الكيمياء العضوية وغير العضوية، مع تجارب عملية مسجلة وفهم عميق للروابط والمفاعلات.',
        color: '#10b981',
        icon: 'FlaskConical',
        price: 160,
        rating: 4.7,
        instructorName: 'د/ سارة محمود',
        level: Difficulty.MEDIUM,
        durationHours: 38,
        thumbnailUrl: 'https://images.unsplash.com/photo-1532187863486-abf9d3a4461a?q=80&w=2070&auto=format&fit=crop',
        enrolledCount: 850,
        isActive: true
    },
    {
        id: 'ARABIC',
        name: 'Arabic',
        nameAr: 'اللغة العربية',
        type: 'ARABIC',
        categoryId: 'ARABIC',
        code: 'ARAB101',
        description: 'إتقان اللغة العربية، النحو، البلاغة، والأدب بأسلوب شيق يضمن الدرجات النهائية.',
        color: '#f59e0b',
        icon: 'BookOpen',
        price: 120,
        rating: 4.9,
        instructorName: 'أ/ مصطفى سعيد',
        level: Difficulty.EASY,
        durationHours: 30,
        thumbnailUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=1974&auto=format&fit=crop',
        enrolledCount: 2100,
        isActive: true
    },
    {
        id: 'ENGLISH',
        name: 'English',
        nameAr: 'اللغة الإنجليزية',
        type: 'ENGLISH',
        categoryId: 'ENGLISH',
        code: 'ENGL101',
        description: 'تطوير مهارات اللغة الإنجليزية، القواعد، الكلمات، والترجمة للمرحلة الثانوية.',
        color: '#8b5cf6',
        icon: 'Languages',
        price: 140,
        rating: 4.6,
        instructorName: 'Mrs. Jane Doe',
        level: Difficulty.MEDIUM,
        durationHours: 35,
        thumbnailUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=1973&auto=format&fit=crop',
        enrolledCount: 1550,
        isActive: true
    },
    {
        id: 'SCIENCE',
        name: 'Science',
        nameAr: 'العلوم',
        type: 'SCIENCE',
        categoryId: 'SCIENCE',
        code: 'SCI101',
        description: 'شرح مبسط لمبادئ العلوم العامة.',
        color: '#06b6d4',
        icon: 'Beaker',
        price: 100,
        rating: 4.5,
        instructorName: 'أ/ محمود كامل',
        level: Difficulty.EASY,
        durationHours: 25,
        thumbnailUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=2070&auto=format&fit=crop',
        enrolledCount: 500,
        isActive: true
    },
    {
        id: 'SOCIAL_STUDIES',
        name: 'Social Studies',
        nameAr: 'الدراسات الاجتماعية',
        type: 'SOCIAL',
        categoryId: 'SOCIAL_STUDIES',
        code: 'SOC101',
        description: 'تاريخ وجغرافيا للمرحلة الثانوية.',
        color: '#84cc16',
        icon: 'Globe',
        price: 110,
        rating: 4.4,
        instructorName: 'أ/ هاني يوسف',
        level: Difficulty.MEDIUM,
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

    console.log('✓ Subjects seeded successfully.')
}

export default seedSubjectsData;
