import { prisma } from '../src/lib/db'
import { Level } from '@prisma/client'

const subjects = [
    {
        id: 'math-course',
        name: 'Mathematics',
        nameAr: 'الرياضيات',
        type: 'MATH',
        code: 'MATH101',
        description: 'شرح متكامل لمنهج الرياضيات للمرحلة الثانوية، يغطي الجبر وحساب المثلثات والتفاضل والتكامل.',
        color: '#3b82f6',
        icon: 'Calculator',
        price: 150,
        rating: 4.8,
        instructorName: 'أ/ محمد علي',
        level: Level.INTERMEDIATE,
        durationHours: 40,
        thumbnailUrl: 'https://images.unsplash.com/photo-1509228468518-180dd48a5793?q=80&w=2070&auto=format&fit=crop',
        enrolledCount: 1250,
        isActive: true
    },
    {
        id: 'physics-course',
        name: 'Physics',
        nameAr: 'الفيزياء',
        type: 'PHYSICS',
        code: 'PHYS101',
        description: 'دورة شاملة في الفيزياء تغطي الميكانيكا، الضوء، الكهرباء، والفيزياء الحديثة بأسلوب مبسط.',
        color: '#ef4444',
        icon: 'Zap',
        price: 180,
        rating: 4.9,
        instructorName: 'أ/ أحمد حسن',
        level: Level.ADVANCED,
        durationHours: 45,
        thumbnailUrl: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?q=80&w=2070&auto=format&fit=crop',
        enrolledCount: 980,
        isActive: true
    },
    {
        id: 'chemistry-course',
        name: 'Chemistry',
        nameAr: 'الكيمياء',
        type: 'CHEMISTRY',
        code: 'CHEM101',
        description: 'تعلم الكيمياء العضوية وغير العضوية، مع تجارب عملية مسجلة وفهم عميق للروابط والمفاعلات.',
        color: '#10b981',
        icon: 'FlaskConical',
        price: 160,
        rating: 4.7,
        instructorName: 'د/ سارة محمود',
        level: Level.INTERMEDIATE,
        durationHours: 38,
        thumbnailUrl: 'https://images.unsplash.com/photo-1532187863486-abf9d3a4461a?q=80&w=2070&auto=format&fit=crop',
        enrolledCount: 850,
        isActive: true
    },
    {
        id: 'arabic-course',
        name: 'Arabic',
        nameAr: 'اللغة العربية',
        type: 'ARABIC',
        code: 'ARAB101',
        description: 'إتقان اللغة العربية، النحو، البلاغة، والأدب بأسلوب شيق يضمن الدرجات النهائية.',
        color: '#f59e0b',
        icon: 'BookOpen',
        price: 120,
        rating: 4.9,
        instructorName: 'أ/ مصطفى سعيد',
        level: Level.BEGINNER,
        durationHours: 30,
        thumbnailUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=1974&auto=format&fit=crop',
        enrolledCount: 2100,
        isActive: true
    },
    {
        id: 'english-course',
        name: 'English',
        nameAr: 'اللغة الإنجليزية',
        type: 'ENGLISH',
        code: 'ENGL101',
        description: 'تطوير مهارات اللغة الإنجليزية، القواعد، الكلمات، والترجمة للمرحلة الثانوية.',
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
