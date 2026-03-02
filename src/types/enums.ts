export enum SubjectType {
    MATH = 'MATH',
    PHYSICS = 'PHYSICS',
    CHEMISTRY = 'CHEMISTRY',
    ARABIC = 'ARABIC',
    ENGLISH = 'ENGLISH'
}

export enum ExamType {
    FINAL = 'FINAL',
    MIDTERM = 'MIDTERM',
    QUIZ = 'QUIZ',
    PRACTICE = 'PRACTICE',
    OTHER = 'OTHER'
}

export enum FocusStrategy {
    POMODORO = 'POMODORO',
    EIGHTY_TWENTY = 'EIGHTY_TWENTY',
    DEEP_WORK = 'DEEP_WORK',
    TIME_BLOCKING = 'TIME_BLOCKING',
    NO_DISTRACTION = 'NO_DISTRACTION'
}

export enum TaskStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export enum UserRole {
    USER = 'USER',
    ADMIN = 'ADMIN',
    TEACHER = 'TEACHER',
    MODERATOR = 'MODERATOR',
}
