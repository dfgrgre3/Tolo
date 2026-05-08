--
-- PostgreSQL database dump
--

\restrict WXtnxb1aVW7LJBowTcfyxOqF9JVrogvCdlMqzUdiOtNApzvNq1Szor1it0sDCb9

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

\set MEDIUM_LOWER 'medium'
\set PENDING_LOWER 'pending'
\set SOFT_DELETE_COMMENT 'Soft delete timestamp - NULL means active'
\set COMPLETED_STATUS 'COMPLETED'
\set CANCELLED_STATUS 'CANCELLED'
\set INACTIVE_STATUS 'INACTIVE'
\set ACTIVE_STATUS 'ACTIVE'
\set PENDING_STATUS 'PENDING'
\set MEDIUM_VAL 'MEDIUM'
\set DRAFT_STATUS 'DRAFT'
\set DRAFT_STATUS_LOWER 'draft'
\set COURSE_TYPE '''COURSE'''

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: AchievementCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.AchievementCategory AS ENUM (
    'STUDY',
    'TASKS',
    'EXAMS',
    'TIME',
    'STREAK'
);


--
-- Name: AddonType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.AddonType AS ENUM (
    'EXAM_PACK',
    'AI_CREDITS',
    'TEACHER_HOURS',
    'OTHER'
);


--
-- Name: CategoryType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.CategoryType AS ENUM (
    'BLOG',
    'FORUM',
    :COURSE_TYPE
);


--
-- Name: ContestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ContestStatus AS ENUM (
    :'DRAFT_STATUS', -- NOSONAR
    'WAITING',
    'IN_PROGRESS',
    'FINISHED'
);


--
-- Name: Difficulty; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.Difficulty AS ENUM (
    'EASY',
    :'MEDIUM_VAL',
    'HARD',
    'EXPERT'
);


--
-- Name: DiscountType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.DiscountType AS ENUM (
    'PERCENTAGE',
    'FIXED'
);


--
-- Name: FocusStrategy; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.FocusStrategy AS ENUM (
    'POMODORO',
    'EIGHTY_TWENTY',
    'DEEP_WORK',
    'TIME_BLOCKING',
    'NO_DISTRACTION'
);


--
-- Name: InvoiceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.InvoiceStatus AS ENUM (
    :'DRAFT_STATUS', -- NOSONAR
    'OPEN',
    'PAID',
    'VOID',
    'UNCOLLECTIBLE'
);


--
-- Name: LessonType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.LessonType AS ENUM (
    'VIDEO',
    'ARTICLE',
    'QUIZ',
    'FILE',
    'ASSIGNMENT'
);


--
-- Name: Level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.Level AS ENUM (
    'BEGINNER',
    'INTERMEDIATE',
    'ADVANCED'
);


--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.NotificationType AS ENUM (
    'INFO',
    'SUCCESS',
    'WARNING',
    'ERROR'
);


--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.PaymentStatus AS ENUM (
    :'PENDING_STATUS',
    'SUCCESS',
    'FAILED',
    'REFUNDED'
);


--
-- Name: PlanInterval; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.PlanInterval AS ENUM (
    'MONTHLY',
    'QUARTERLY',
    'YEARLY',
    'LIFETIME'
);


--
-- Name: SubscriptionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.SubscriptionStatus AS ENUM (
    :'ACTIVE_STATUS',
    :'INACTIVE_STATUS',
    'EXPIRED',
    :'CANCELLED_STATUS',
    'GRACE_PERIOD'
);


--
-- Name: TaskStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.TaskStatus AS ENUM (
    :'PENDING_STATUS',
    'IN_PROGRESS',
    :'COMPLETED_STATUS',
    :'CANCELLED_STATUS'
);


--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.UserRole AS ENUM (
    'USER',
    'STUDENT',
    'ADMIN',
    'TEACHER',
    'MODERATOR'
);


--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.UserStatus AS ENUM (
    :'ACTIVE_STATUS',
    :'INACTIVE_STATUS',
    'SUSPENDED',
    'DELETED'
);


--
-- Name: WalletTransactionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.WalletTransactionStatus AS ENUM (
    :'PENDING_STATUS',
    :'COMPLETED_STATUS',
    'FAILED',
    :'CANCELLED_STATUS'
);


--
-- Name: WalletTransactionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.WalletTransactionType AS ENUM (
    'DEPOSIT',
    'WITHDRAWAL',
    'PAYMENT',
    'REFUND',
    'REFERRAL_REWARD',
    'BONUS'
);


--
-- Name: audit_delete_payment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_delete_payment() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO deleted_record_archive (table_name, record_id, user_id, data, reason)
    VALUES ('Payment', OLD.id, COALESCE(to_jsonb(OLD)->>'userId', to_jsonb(OLD)->>'user_id'), row_to_json(OLD), COALESCE(to_jsonb(OLD)->>'archiveReason', to_jsonb(OLD)->>'archive_reason'));
    RETURN OLD;
END;
$$;


--
-- Name: audit_delete_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_delete_user() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO deleted_record_archive (table_name, record_id, user_id, data, reason)
    VALUES ('users', OLD.id, OLD.id, row_to_json(OLD), COALESCE(to_jsonb(OLD)->>'archiveReason', to_jsonb(OLD)->>'archive_reason'));
    RETURN OLD;
END;
$$;


--
-- Name: cuid(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cuid() RETURNS text
    LANGUAGE plpgsql
    AS $$
		BEGIN
			RETURN (
				'c' || 
				substring(extract(epoch from now())::text from 1 for 8) || 
				substring(md5(random()::text) from 1 for 16)
			);
		END;
		$$;


--
-- Name: restore_soft_deleted(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.restore_soft_deleted(table_name text, record_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $_$
BEGIN
    EXECUTE format(
        'UPDATE %I SET deleted_at = NULL WHERE id = $1',
        table_name
    ) USING record_id;
END;
$_$;


--
-- Name: soft_delete_record(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.soft_delete_record(table_name text, record_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $_$
BEGIN
    EXECUTE format(
        'UPDATE %I SET deleted_at = NOW() WHERE id = $1',
        table_name
    ) USING record_id;
END;
$_$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ABExperiment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ABExperiment" (
    id uuid NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT :'DRAFT_STATUS'::text, -- NOSONAR
    variants text,
    traffic_pct bigint DEFAULT 100,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: Achievement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Achievement" (
    id uuid NOT NULL,
    key text NOT NULL,
    title text NOT NULL,
    description text,
    icon text,
    rarity text DEFAULT 'common'::text NOT NULL,
    xp_reward bigint DEFAULT 0,
    requirements text NOT NULL,
    is_secret boolean DEFAULT false CONSTRAINT "Achievement_isSecret_not_null" NOT NULL,
    unlocked_count integer DEFAULT 0 CONSTRAINT "Achievement_unlockedCount_not_null" NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    category text,
    difficulty text DEFAULT 'EASY'::text,
    deleted_at timestamp with time zone,
    criteria text
);


--
-- Name: SubjectEnrollment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SubjectEnrollment" (
    id uuid NOT NULL,
    user_id uuid CONSTRAINT "SubjectEnrollment_user_id_not_null" NOT NULL,
    subject_id uuid CONSTRAINT "SubjectEnrollment_subject_id_not_null" NOT NULL,
    enrolled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    progress double precision DEFAULT 0,
    deleted_at timestamp with time zone
);


--
-- Name: ActiveEnrollments; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.ActiveEnrollments AS
 SELECT id,
    user_id,
    subject_id,
    "targetWeeklyHours",
    created_at AS "createdAt",
    updated_at AS "updatedAt",
    "paymentStatus",
    progress,
    "isDeleted",
    deleted_at AS "deletedAt",
    "completedLessonsCount",
    enrolled_at AS "enrolledAt"
   FROM public.SubjectEnrollment
  WHERE (deleted_at IS NULL);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    name text,
    username text,
    avatar text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    wake_up_time text,
    sleep_time text,
    focus_strategy text DEFAULT 'POMODORO'::text,
    email_notifications boolean DEFAULT true,
    email_verification_token text,
    email_verification_expires timestamp(3) without time zone,
    email_verified boolean DEFAULT false,
    last_login timestamp(3) without time zone,
    phone text,
    phone_verified boolean DEFAULT false,
    phone_verification_otp text,
    phone_verification_expires timestamp(3) without time zone,
    phone_verification_attempts integer DEFAULT 0 NOT NULL,
    phone_verification_last_sent timestamp(3) without time zone,
    reset_token text,
    reset_token_expires timestamp(3) without time zone,
    recovery_codes text,
    sms_notifications boolean DEFAULT false,
    biometric_enabled boolean DEFAULT false NOT NULL,
    magic_link_token text,
    magic_link_expires timestamp(3) without time zone,
    google_id text,
    github_id text,
    password_changed_at timestamp(3) without time zone,
    password_expires_at timestamp(3) without time zone,
    password_expiration_warning_sent boolean DEFAULT false NOT NULL,
    role public."UserRole" DEFAULT 'STUDENT'::public."UserRole" NOT NULL,
    status public."UserStatus" DEFAULT :'ACTIVE_STATUS'::public."UserStatus" NOT NULL,
    country text,
    date_of_birth timestamp(3) without time zone,
    gender text,
    alternative_phone text,
    section text,
    interested_subjects text[] DEFAULT ARRAY[]::text[],
    study_goal text,
    subjects_taught text[] DEFAULT ARRAY[]::text[],
    classes_taught text[] DEFAULT ARRAY[]::text[],
    experience_years text,
    bio text,
    permissions jsonb DEFAULT '[]'::jsonb,
    school text,
    referral_code text,
    referred_by_id uuid,
    additional_ai_credits integer DEFAULT 0 NOT NULL,
    additional_exam_credits integer DEFAULT 0 NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    last_usage_reset timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    monthly_ai_message_count integer DEFAULT 0 NOT NULL,
    monthly_exam_count integer DEFAULT 0 NOT NULL,
    total_xp bigint DEFAULT 0,
    level bigint DEFAULT 1,
    balance numeric DEFAULT 0,
    ai_credits bigint DEFAULT 0,
    exam_credits bigint DEFAULT 0,
    reset_password_token text,
    reset_password_expires timestamp with time zone,
    verification_token text,
    verification_expires timestamp with time zone,
    deleted_at timestamp with time zone,
    current_streak integer DEFAULT 0 NOT NULL,
    longest_streak integer DEFAULT 0 NOT NULL,
    total_study_time integer DEFAULT 0 NOT NULL,
    tasks_completed integer DEFAULT 0 NOT NULL,
    exams_passed integer DEFAULT 0 NOT NULL,
    study_xp integer DEFAULT 0 NOT NULL,
    task_xp integer DEFAULT 0 NOT NULL,
    exam_xp integer DEFAULT 0 NOT NULL,
    challenge_xp integer DEFAULT 0 NOT NULL,
    quest_xp integer DEFAULT 0 NOT NULL,
    season_xp integer DEFAULT 0 NOT NULL,
    "archiveReason" text,
    password_hash text NOT NULL,
    grade_level text,
    education_type text,
    version bigint DEFAULT 1,
    active_subscription_id uuid,
    subscription_expires_at timestamp with time zone,
    two_factor_enabled boolean DEFAULT false,
    two_factor_secret text,
    CONSTRAINT chk_user_ai_credits_nonneg CHECK ((ai_credits >= 0)),
    CONSTRAINT chk_user_ai_credits_nonnegative CHECK ((ai_credits >= 0)),
    CONSTRAINT chk_user_balance_nonneg CHECK ((balance >= (0)::numeric)),
    CONSTRAINT chk_user_balance_nonnegative CHECK ((balance >= (0)::numeric)),
    CONSTRAINT chk_user_exam_credits_nonnegative CHECK ((exam_credits >= 0)),
    CONSTRAINT chk_user_level_positive CHECK ((level >= 1)),
    CONSTRAINT chk_user_streak_nonnegative CHECK ((current_streak >= 0)),
    CONSTRAINT chk_user_total_xp_nonnegative CHECK ((total_xp >= 0))
);


--
-- Name: ActiveUsers; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.ActiveUsers AS
 SELECT id,
    email,
    name,
    username,
    avatar,
    created_at,
    updated_at,
    "wakeUpTime",
    "sleepTime",
    "focusStrategy",
    "emailNotifications",
    "emailVerificationToken",
    "emailVerificationExpires",
    email_verified,
    last_login,
    phone,
    phone_verified,
    "phoneVerificationOTP",
    "phoneVerificationExpires",
    "phoneVerificationAttempts",
    "phoneVerificationLastSent",
    "resetToken",
    "resetTokenExpires",
    "recoveryCodes",
    "smsNotifications",
    "biometricEnabled",
    magic_link_token,
    magic_link_expires,
    "googleId",
    "githubId",
    "passwordChangedAt",
    "passwordExpiresAt",
    "passwordExpirationWarningSent",
    role,
    status,
    country,
    "dateOfBirth",
    gender,
    "alternativePhone",
    section,
    "interestedSubjects",
    "studyGoal",
    "subjectsTaught",
    "classesTaught",
    "experienceYears",
    bio,
    permissions,
    school,
    "referralCode",
    referred_by_id,
    "additionalAiCredits",
    "additionalExamCredits",
    "isDeleted",
    "lastUsageReset",
    "monthlyAiMessageCount",
    "monthlyExamCount",
    total_xp,
    level,
    balance,
    ai_credits,
    exam_credits,
    reset_password_token,
    reset_password_expires,
    verification_token,
    verification_expires,
    deleted_at,
    current_streak,
    longest_streak,
    total_study_time,
    tasks_completed,
    exams_passed,
    study_xp,
    task_xp,
    exam_xp,
    challenge_xp,
    quest_xp,
    season_xp,
    "archiveReason",
    password_hash
   FROM public."User"
  WHERE (deleted_at IS NULL);


--
-- Name: Addon; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Addon" (
    id text NOT NULL,
    name text NOT NULL,
    "nameAr" text,
    description text,
    price double precision NOT NULL,
    type public."AddonType" NOT NULL,
    value integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AiChatMessage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AiChatMessage" (
    id text NOT NULL,
    "userId" text NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    sentiment text,
    metadata text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AiGeneratedContent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AiGeneratedContent" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    "subjectId" text,
    metadata text,
    "isUsed" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AiGeneratedExam; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AiGeneratedExam" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "subjectId" text NOT NULL,
    title text NOT NULL,
    duration integer NOT NULL,
    year integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    difficulty public."Difficulty" DEFAULT :'MEDIUM_VAL'::public."Difficulty" NOT NULL
);


--
-- Name: AiQuestion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AiQuestion" (
    id text NOT NULL,
    "examId" text NOT NULL,
    question text NOT NULL,
    "correctAnswer" text NOT NULL,
    explanation text,
    points integer DEFAULT 1 NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    options text[]
);


--
-- Name: AnalyticsEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AnalyticsEvent" (
    id text NOT NULL,
    "userId" text,
    type text NOT NULL,
    metadata text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Announcement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Announcement" (
    id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    type text DEFAULT 'INFO'::text NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "authorId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Automation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Automation" (
    id uuid NOT NULL,
    name text NOT NULL,
    description text,
    event text NOT NULL,
    trigger text,
    conditions text,
    actions text,
    is_active boolean DEFAULT true,
    last_run_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: AutomationLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AutomationLog" (
    id text NOT NULL,
    "ruleId" text NOT NULL,
    "userId" text NOT NULL,
    "actionTaken" text NOT NULL,
    metadata text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AutomationRule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AutomationRule" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "triggerType" text NOT NULL,
    conditions text NOT NULL,
    "actionType" text NOT NULL,
    "actionData" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: BiometricChallenge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BiometricChallenge" (
    id text NOT NULL,
    challenge text NOT NULL,
    type text NOT NULL,
    "userId" text,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: BiometricCredential; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BiometricCredential" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "credentialId" text NOT NULL,
    "publicKey" text NOT NULL,
    counter integer DEFAULT 0 NOT NULL,
    "deviceType" text,
    "deviceName" text,
    transports text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: BlogPost; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BlogPost" (
    id uuid NOT NULL,
    title text NOT NULL,
    content text,
    excerpt text,
    slug text NOT NULL,
    "categoryId" text NOT NULL,
    "authorId" text NOT NULL,
    "isPublished" boolean DEFAULT false NOT NULL,
    "publishedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    views integer DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone,
    author_id uuid,
    category_id uuid,
    tags jsonb,
    status text DEFAULT :'DRAFT_STATUS'::text, -- NOSONAR
    image text,
    published_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: COLUMN "BlogPost".deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."BlogPost".deleted_at IS :'SOFT_DELETE_COMMENT';


--
-- Name: Book; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Book" (
    id uuid NOT NULL,
    title text NOT NULL,
    author text,
    description text,
    "subjectId" text,
    "coverUrl" text,
    "downloadUrl" text NOT NULL,
    rating double precision DEFAULT 0 NOT NULL,
    views integer DEFAULT 0 NOT NULL,
    downloads integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    tags text[] DEFAULT ARRAY[]::text[],
    price double precision DEFAULT 0,
    "uploaderId" text,
    deleted_at timestamp with time zone,
    cover_url text,
    download_url text,
    subject_id uuid,
    is_free boolean DEFAULT true
);


--
-- Name: COLUMN "Book".deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Book".deleted_at IS :'SOFT_DELETE_COMMENT';


--
-- Name: BookProgress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BookProgress" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "bookId" text NOT NULL,
    progress double precision DEFAULT 0 NOT NULL,
    "lastReadAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isCompleted" boolean DEFAULT false NOT NULL,
    "currentPage" integer DEFAULT 0 NOT NULL,
    "totalPages" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: BookReview; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BookReview" (
    id text NOT NULL,
    "bookId" text NOT NULL,
    "userId" text NOT NULL,
    rating integer NOT NULL,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Category" (
    id uuid NOT NULL,
    name text NOT NULL,
    description text,
    slug text NOT NULL,
    icon text,
    type text DEFAULT :COURSE_TYPE::text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp with time zone,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: Challenge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Challenge" (
    id uuid NOT NULL,
    title text NOT NULL,
    description text,
    type text DEFAULT 'daily'::text,
    category text,
    xp_reward bigint DEFAULT 0,
    requirements text NOT NULL,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    is_active boolean DEFAULT true CONSTRAINT "Challenge_isActive_not_null" NOT NULL,
    subject_id uuid,
    "levelRange" text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    difficulty text DEFAULT 'EASY'::text,
    deleted_at timestamp with time zone
);


--
-- Name: ChallengeCompletion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ChallengeCompletion" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "challengeId" text NOT NULL,
    "completedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    progress double precision DEFAULT 0 NOT NULL,
    "isCompleted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ContentPreference; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ContentPreference" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "itemType" text NOT NULL,
    "itemValue" text NOT NULL,
    weight double precision DEFAULT 1.0 NOT NULL,
    source text,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ContentReport; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ContentReport" (
    id uuid NOT NULL,
    "userId" text NOT NULL,
    "targetId" text NOT NULL,
    "targetType" text NOT NULL,
    "subjectId" text,
    "issueType" text NOT NULL,
    description text NOT NULL,
    status text DEFAULT :'PENDING_STATUS'::text NOT NULL,
    "adminNote" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Contest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Contest" (
    id uuid NOT NULL,
    title text NOT NULL,
    description text,
    "imageUrl" text,
    category text,
    tags text[],
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    rules text,
    prizes text,
    "isActive" boolean DEFAULT true NOT NULL,
    status public."ContestStatus" DEFAULT :'DRAFT_STATUS'::public."ContestStatus" NOT NULL, -- NOSONAR
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "pinCode" text,
    "organizerId" text,
    deleted_at timestamp with time zone
);


--
-- Name: COLUMN "Contest".deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Contest".deleted_at IS :'SOFT_DELETE_COMMENT';


--
-- Name: ContestQuestion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ContestQuestion" (
    id uuid NOT NULL,
    "contestId" text NOT NULL,
    question text NOT NULL,
    "correctAnswer" text NOT NULL,
    options text[],
    duration integer DEFAULT 30 NOT NULL,
    points integer DEFAULT 100 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Coupon; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Coupon" (
    id uuid NOT NULL,
    code text NOT NULL,
    description text,
    discount_type public."DiscountType" DEFAULT 'PERCENTAGE'::public."DiscountType" CONSTRAINT "Coupon_discountType_not_null" NOT NULL,
    discount_value numeric CONSTRAINT "Coupon_discountValue_not_null" NOT NULL,
    max_uses bigint,
    used_count integer DEFAULT 0 CONSTRAINT "Coupon_usedCount_not_null" NOT NULL,
    "expiryDate" timestamp(3) without time zone,
    is_active boolean DEFAULT true CONSTRAINT "Coupon_isActive_not_null" NOT NULL,
    "minOrderAmount" double precision DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    "isWinBack" boolean DEFAULT false,
    "minInactiveDays" integer,
    "regionTarget" text,
    "schoolTarget" text,
    "userTargetId" text,
    deleted_at timestamp with time zone,
    min_order_amount numeric DEFAULT 0,
    expiry_date timestamp with time zone,
    CONSTRAINT chk_coupon_discount_positive CHECK (((discount_value)::double precision > (0)::double precision)),
    CONSTRAINT chk_coupon_used_nonnegative CHECK ((used_count >= 0))
);


--
-- Name: CourseReview; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CourseReview" (
    id text NOT NULL,
    "subjectId" text NOT NULL,
    "userId" text NOT NULL,
    rating bigint DEFAULT 5 NOT NULL,
    comment text,
    "isVisible" boolean DEFAULT true,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    deleted_at timestamp with time zone,
    subject_id uuid NOT NULL,
    user_id uuid NOT NULL,
    is_visible boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT chk_course_review_rating_range CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: COLUMN "CourseReview".deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."CourseReview".deleted_at IS :'SOFT_DELETE_COMMENT';


--
-- Name: CustomGoal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CustomGoal" (
    id text NOT NULL,
    "userId" text NOT NULL,
    title text NOT NULL,
    description text,
    "targetValue" double precision NOT NULL,
    "currentValue" double precision DEFAULT 0 NOT NULL,
    unit text NOT NULL,
    category text NOT NULL,
    "isCompleted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "xpReward" integer DEFAULT 10 NOT NULL
);


--
-- Name: DeletedRecordArchive; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deleted_record_archive (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name character varying(255) NOT NULL,
    record_id text NOT NULL,
    user_id text,
    data jsonb NOT NULL,
    reason character varying(500),
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: Event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Event" (
    id uuid NOT NULL,
    title text NOT NULL,
    description text,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    location text,
    "maxAttendees" integer,
    "imageUrl" text,
    "organizerId" text NOT NULL,
    category text NOT NULL,
    "isPublic" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    tags text[] DEFAULT ARRAY[]::text[],
    deleted_at timestamp with time zone
);


--
-- Name: COLUMN "Event".deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Event".deleted_at IS :'SOFT_DELETE_COMMENT';


--
-- Name: EventAttendee; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EventAttendee" (
    id text NOT NULL,
    event_id uuid CONSTRAINT "EventAttendee_eventId_not_null" NOT NULL,
    user_id uuid CONSTRAINT "EventAttendee_userId_not_null" NOT NULL,
    status text DEFAULT :'PENDING_LOWER'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Exam; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Exam" (
    id uuid NOT NULL,
    subject_id uuid CONSTRAINT "Exam_subjectId_not_null" NOT NULL,
    title text NOT NULL,
    year integer NOT NULL,
    url text NOT NULL,
    type text DEFAULT 'QUIZ'::text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    duration bigint,
    max_score numeric DEFAULT 100,
    deleted_at timestamp with time zone,
    description text,
    difficulty character varying(20) DEFAULT :'MEDIUM_LOWER'::character varying,
    is_active boolean DEFAULT true
);


--
-- Name: ExamResult; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ExamResult" (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT "ExamResult_New_id_not_null" NOT NULL,
    user_id uuid CONSTRAINT "ExamResult_New_user_id_not_null" NOT NULL,
    exam_id uuid CONSTRAINT "ExamResult_New_exam_id_not_null" NOT NULL,
    score numeric DEFAULT 0,
    max_score double precision DEFAULT 0,
    passed boolean DEFAULT false,
    answers text,
    taken_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "ExamResult_New_taken_at_not_null" NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
)
PARTITION BY RANGE (taken_at);


--
-- Name: COLUMN "ExamResult".deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ExamResult".deleted_at IS :'SOFT_DELETE_COMMENT';


--
-- Name: Experiment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Experiment" (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT :'DRAFT_STATUS_LOWER'::text NOT NULL,
    "variantAName" text NOT NULL,
    "variantBName" text NOT NULL,
    "variantAViews" integer DEFAULT 0 NOT NULL,
    "variantAComps" integer DEFAULT 0 NOT NULL,
    "variantBViews" integer DEFAULT 0 NOT NULL,
    "variantBComps" integer DEFAULT 0 NOT NULL,
    "startDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endDate" timestamp(3) without time zone,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ForumCategory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ForumCategory" (
    id uuid NOT NULL,
    name text NOT NULL,
    description text,
    icon text,
    "order" bigint DEFAULT 0,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone
);


--
-- Name: ForumPost; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ForumPost" (
    id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    "categoryId" text NOT NULL,
    "authorId" text NOT NULL,
    "isPinned" boolean DEFAULT false NOT NULL,
    "isLocked" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    views integer DEFAULT 0 NOT NULL
);


--
-- Name: ForumReply; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ForumReply" (
    id text NOT NULL,
    content text NOT NULL,
    "postId" text NOT NULL,
    "authorId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ForumTopic; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ForumTopic" (
    id uuid NOT NULL,
    title text NOT NULL,
    content text,
    author_id uuid,
    category_id uuid,
    views bigint DEFAULT 0,
    is_pinned boolean DEFAULT false,
    is_locked boolean DEFAULT false,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone
);


--
-- Name: GroupSubscription; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GroupSubscription" (
    id text NOT NULL,
    "ownerId" text NOT NULL,
    "planId" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Invoice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Invoice" (
    id uuid NOT NULL,
    invoice_number text,
    user_id uuid,
    payment_id uuid,
    amount double precision NOT NULL,
    currency text DEFAULT 'EGP'::text NOT NULL,
    status public."InvoiceStatus" DEFAULT :'DRAFT_STATUS'::public."InvoiceStatus" NOT NULL, -- NOSONAR
    "issueDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    due_date timestamp with time zone,
    "paidDate" timestamp(3) without time zone,
    pdf_url text,
    "billingDetails" text,
    items text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone CONSTRAINT "Invoice_updatedAt_not_null" NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: LeaderboardEntry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LeaderboardEntry" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    period text,
    "subjectId" text,
    "levelRange" text,
    "seasonId" text,
    "totalXP" integer DEFAULT 0 NOT NULL,
    "studyXP" integer DEFAULT 0 NOT NULL,
    "taskXP" integer DEFAULT 0 NOT NULL,
    "examXP" integer DEFAULT 0 NOT NULL,
    "challengeXP" integer DEFAULT 0 NOT NULL,
    "questXP" integer DEFAULT 0 NOT NULL,
    rank integer,
    level integer DEFAULT 1 NOT NULL,
    "lastUpdated" timestamp(3) without time zone NOT NULL
);


--
-- Name: LessonAnswer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LessonAnswer" (
    id text NOT NULL,
    "questionId" text NOT NULL,
    "userId" text NOT NULL,
    content text NOT NULL,
    "isTeacher" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: LessonAttachment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LessonAttachment" (
    id uuid NOT NULL,
    "subTopicId" text NOT NULL,
    title text NOT NULL,
    "fileUrl" text NOT NULL,
    "fileType" text,
    "fileSize" bigint,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: COLUMN "LessonAttachment".deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."LessonAttachment".deleted_at IS :'SOFT_DELETE_COMMENT';


--
-- Name: LessonNote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LessonNote" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "subTopicId" text NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: LessonQuestion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LessonQuestion" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "subTopicId" text NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: LiveEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LiveEvent" (
    id uuid NOT NULL,
    title text NOT NULL,
    description text,
    type text DEFAULT 'LIVE'::text,
    status text DEFAULT 'UPCOMING'::text,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    speaker text,
    join_link text,
    image text,
    subject_id uuid,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone
);


--
-- Name: MarketingCampaign; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MarketingCampaign" (
    id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    audience text NOT NULL,
    "rewardType" text NOT NULL,
    "rewardValue" double precision,
    status text DEFAULT :'DRAFT_STATUS_LOWER'::text NOT NULL,
    "scheduledAt" timestamp(3) without time zone,
    "sentAt" timestamp(3) without time zone,
    "deliveredCount" integer DEFAULT 0 NOT NULL,
    "openedCount" integer DEFAULT 0 NOT NULL,
    "claimedCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Message; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Message" (
    id text NOT NULL,
    "senderId" text NOT NULL,
    "receiverId" text NOT NULL,
    content text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: MlRecommendation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MlRecommendation" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "itemType" text NOT NULL,
    "itemId" text NOT NULL,
    score double precision NOT NULL,
    algorithm text NOT NULL,
    reason text,
    "shownAt" timestamp(3) without time zone,
    "clickedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    feedback text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Notification" (
    id uuid NOT NULL,
    user_id uuid CONSTRAINT "Notification_userId_not_null" NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "actionUrl" text,
    icon text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    type public."NotificationType" DEFAULT 'INFO'::public."NotificationType" NOT NULL,
    "isDeleted" boolean DEFAULT false NOT NULL,
    link text,
    deleted_at timestamp with time zone
);


--
-- Name: OfflineLesson; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OfflineLesson" (
    id text NOT NULL,
    "userId" text NOT NULL,
    title text NOT NULL,
    description text,
    "subjectId" text NOT NULL,
    "teacherId" text,
    location text,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone NOT NULL,
    "maxStudents" integer,
    price double precision,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PasswordHistory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PasswordHistory" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "passwordHash" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PasswordPolicy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PasswordPolicy" (
    id text NOT NULL,
    role text NOT NULL,
    "expirationDays" integer,
    "minLength" integer DEFAULT 8 NOT NULL,
    "maxLength" integer DEFAULT 128 NOT NULL,
    "requireUppercase" boolean DEFAULT true NOT NULL,
    "requireLowercase" boolean DEFAULT true NOT NULL,
    "requireNumbers" boolean DEFAULT true NOT NULL,
    "requireSpecial" boolean DEFAULT true NOT NULL,
    "historyCount" integer DEFAULT 10 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "warningDays" integer[] DEFAULT ARRAY[7, 3, 1],
    "bannedPasswords" text[] DEFAULT ARRAY[]::text[]
);


--
-- Name: Payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Payment" (
    id uuid NOT NULL,
    user_id uuid CONSTRAINT "Payment_user_id_not_null" NOT NULL,
    plan_id uuid,
    amount numeric NOT NULL,
    currency text DEFAULT 'EGP'::text NOT NULL,
    status text DEFAULT :'PENDING_LOWER'::text NOT NULL,
    method text NOT NULL,
    reference text UNIQUE NOT NULL,
    paymob_order_id bigint,
    external_txn_id text,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    subject_id uuid,
    "paymentData" text,
    "errorMessage" text,
    "couponId" text,
    "discountAmount" double precision DEFAULT 0,
    "referralRewardId" text,
    "creditAmount" double precision DEFAULT 0,
    "balanceUsed" double precision DEFAULT 0,
    "promoDiscount" double precision DEFAULT 0,
    "prorationDiscount" double precision DEFAULT 0,
    "archiveReason" text,
    CONSTRAINT chk_payment_amount_nonnegative CHECK ((amount >= (0)::numeric)),
    CONSTRAINT chk_payment_status_valid CHECK ((status = ANY (ARRAY[:'PENDING_LOWER'::text, 'completed'::text, 'failed'::text, 'refunded'::text, 'cancelled'::text])))
);


--
-- Name: PaymentStatusLookup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PaymentStatusLookup" (
    code character varying(20) NOT NULL,
    label character varying(50) NOT NULL,
    description text,
    color character varying(7) DEFAULT '#000000'::character varying,
    "isActive" boolean DEFAULT true,
    "sortOrder" integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ProgressSnapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProgressSnapshot" (
    id text NOT NULL,
    "userId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "totalStudyMinutes" integer DEFAULT 0 NOT NULL,
    "averageFocusScore" double precision DEFAULT 0 NOT NULL,
    "completedTasks" integer DEFAULT 0 NOT NULL,
    "streakDays" integer DEFAULT 0 NOT NULL,
    "gradeAverage" double precision,
    "improvementRate" double precision,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Quest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Quest" (
    id text NOT NULL,
    "chainId" text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    "order" integer NOT NULL,
    "xpReward" integer NOT NULL,
    requirements text NOT NULL,
    prerequisites text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: QuestChain; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."QuestChain" (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    "totalQuests" integer DEFAULT 1 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    difficulty public."Difficulty" DEFAULT :'MEDIUM_VAL'::public."Difficulty" NOT NULL
);


--
-- Name: QuestProgress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."QuestProgress" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "questId" text NOT NULL,
    "chainId" text NOT NULL,
    progress double precision DEFAULT 0 NOT NULL,
    "isCompleted" boolean DEFAULT false NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Question; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Question" (
    id uuid NOT NULL,
    exam_id uuid CONSTRAINT "Question_examId_not_null" NOT NULL,
    text text NOT NULL,
    type text DEFAULT 'MCQ'::text,
    options text,
    answer text NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: ReferralReward; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ReferralReward" (
    id text NOT NULL,
    "referrerId" text NOT NULL,
    "referredId" text NOT NULL,
    amount double precision NOT NULL,
    status text DEFAULT :'PENDING_STATUS'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Reminder; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Reminder" (
    id uuid NOT NULL,
    user_id uuid CONSTRAINT "Reminder_userId_not_null" NOT NULL,
    title text NOT NULL,
    message text,
    remind_at timestamp with time zone,
    repeat text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    type text DEFAULT 'STUDY'::text,
    priority text DEFAULT :'MEDIUM_VAL'::text,
    is_active boolean DEFAULT true,
    deleted_at timestamp with time zone
);


--
-- Name: COLUMN "Reminder".deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Reminder".deleted_at IS :'SOFT_DELETE_COMMENT';


--
-- Name: Resource; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Resource" (
    id text NOT NULL,
    "subjectId" text NOT NULL,
    title text NOT NULL,
    description text,
    url text NOT NULL,
    free boolean DEFAULT true NOT NULL,
    type text NOT NULL,
    source text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    price double precision DEFAULT 0,
    "minPlanLevel" integer DEFAULT 0 NOT NULL,
    subject_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: Reward; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Reward" (
    id uuid NOT NULL,
    name text NOT NULL,
    description text,
    type text DEFAULT 'VIRTUAL'::text,
    rarity text NOT NULL,
    "imageUrl" text,
    metadata text,
    "isTradeable" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    deleted_at timestamp with time zone,
    title text NOT NULL,
    cost bigint DEFAULT 0,
    stock bigint DEFAULT '-1'::integer,
    image text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: COLUMN "Reward".deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Reward".deleted_at IS :'SOFT_DELETE_COMMENT';


--
-- Name: Schedule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Schedule" (
    id uuid NOT NULL,
    user_id uuid CONSTRAINT "Schedule_userId_not_null" NOT NULL,
    name text,
    title text NOT NULL,
    description text,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone NOT NULL,
    "subjectId" text,
    type text DEFAULT 'study'::text NOT NULL,
    color text,
    active boolean DEFAULT true NOT NULL,
    plan_json text,
    version integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone
);


--
-- Name: COLUMN "Schedule".deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Schedule".deleted_at IS :'SOFT_DELETE_COMMENT';


--
-- Name: Season; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Season" (
    id uuid NOT NULL,
    name text NOT NULL,
    description text,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    rewards text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp with time zone,
    deleted_at timestamp with time zone,
    title text NOT NULL,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    is_active boolean DEFAULT false,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: COLUMN "Season".deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Season".deleted_at IS :'SOFT_DELETE_COMMENT';


--
-- Name: SeasonParticipation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SeasonParticipation" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "seasonId" text NOT NULL,
    "seasonXP" integer DEFAULT 0 NOT NULL,
    rank integer,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: SecurityLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SecurityLog" (
    id uuid NOT NULL,
    user_id uuid,
    event_type text CONSTRAINT "SecurityLog_eventType_not_null" NOT NULL,
    ip text NOT NULL,
    user_agent text,
    "deviceInfo" text,
    location text,
    metadata text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "SecurityLog_createdAt_not_null" NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone
);


--
-- Name: SecurityQuestion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SecurityQuestion" (
    id text NOT NULL,
    "userId" text NOT NULL,
    question text NOT NULL,
    "answerHash" text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: SentimentAnalysis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SentimentAnalysis" (
    id text NOT NULL,
    "userId" text NOT NULL,
    text text NOT NULL,
    sentiment text NOT NULL,
    score double precision NOT NULL,
    confidence double precision NOT NULL,
    emotions text,
    context text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "userAgent" text,
    ip text NOT NULL,
    "deviceInfo" text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" timestamp with time zone,
    "lastAccessed" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "isActive" boolean DEFAULT true NOT NULL,
    "isTrusted" boolean DEFAULT false NOT NULL,
    location text,
    "refreshToken" text,
    "updatedAt" timestamp with time zone,
    "deviceType" text,
    "deletedAt" timestamp with time zone,
    deleted_at timestamp with time zone
);


--
-- Name: COLUMN "Session".deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Session".deleted_at IS :'SOFT_DELETE_COMMENT';


--
-- Name: StudySession; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StudySession" (
    id uuid NOT NULL,
    user_id uuid CONSTRAINT "StudySession_userId_not_null" NOT NULL,
    subject_id uuid,
    "taskId" text,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    duration_min integer DEFAULT 0,
    focus_score integer DEFAULT 0 CONSTRAINT "StudySession_focusScore_not_null" NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    strategy public."FocusStrategy",
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    status public."TaskStatus" DEFAULT :'PENDING_STATUS'::public."TaskStatus" NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT chk_study_session_duration_nonnegative CHECK ((duration_min >= 0)),
    CONSTRAINT chk_study_session_focus_score_range CHECK (((focus_score >= 0) AND (focus_score <= 100)))
);


--
-- Name: COLUMN "StudySession".deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."StudySession".deleted_at IS :'SOFT_DELETE_COMMENT';


--
-- Name: SubTopic; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SubTopic" (
    id uuid NOT NULL,
    topic_id uuid CONSTRAINT "SubTopic_topicId_not_null" NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    description text,
    content text,
    video_url text,
    "order" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    duration_minutes integer DEFAULT 0 CONSTRAINT "SubTopic_durationMinutes_not_null" NOT NULL,
    is_free boolean DEFAULT false CONSTRAINT "SubTopic_isFree_not_null" NOT NULL,
    type public."LessonType" DEFAULT 'VIDEO'::public."LessonType" NOT NULL,
    exam_id uuid,
    deleted_at timestamp with time zone
);


--
-- Name: Subject; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Subject" (
    id uuid NOT NULL,
    name text NOT NULL,
    name_ar text,
    code text,
    description text,
    icon text,
    color text DEFAULT '#3b82f6'::text,
    type text DEFAULT :COURSE_TYPE::text,
    is_active boolean DEFAULT true CONSTRAINT "Subject_isActive_not_null" NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    category_id uuid,
    duration_hours integer DEFAULT 0,
    enrolled_count integer DEFAULT 0,
    instructor_id uuid,
    instructor_name text,
    is_published boolean DEFAULT false CONSTRAINT "Subject_isPublished_not_null" NOT NULL,
    learning_objectives text,
    level text DEFAULT 'INTERMEDIATE'::text,
    price double precision DEFAULT 0,
    rating double precision DEFAULT 0,
    requirements text,
    thumbnail_url text,
    trailer_url text,
    seo_title text,
    seo_description text,
    slug text,
    completion_rate double precision DEFAULT 0,
    course_prerequisites text[] DEFAULT ARRAY[]::text[],
    is_featured boolean DEFAULT false CONSTRAINT "Subject_isFeatured_not_null" NOT NULL,
    language text DEFAULT 'ar'::text,
    last_content_update timestamp(3) without time zone,
    target_audience text[] DEFAULT ARRAY[]::text[],
    video_count integer DEFAULT 0,
    what_you_learn text[] DEFAULT ARRAY[]::text[],
    trailer_duration_minutes integer DEFAULT 0,
    deleted_at timestamp with time zone,
    CONSTRAINT chk_subject_completion_rate_range CHECK (((completion_rate >= (0)::double precision) AND (completion_rate <= (100)::double precision))),
    CONSTRAINT chk_subject_enrolled_count_nonnegative CHECK ((enrolled_count >= 0)),
    CONSTRAINT chk_subject_price_nonnegative CHECK ((price >= (0)::double precision)),
    CONSTRAINT chk_subject_rating_range CHECK (((rating >= (0)::double precision) AND (rating <= (5)::double precision)))
);


--
-- Name: SubjectCertificate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SubjectCertificate" (
    id text NOT NULL,
    "subjectId" text NOT NULL,
    "userId" text NOT NULL,
    "issuedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "certUrl" text
);


--
-- Name: SubjectReview; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SubjectReview" (
    id text NOT NULL,
    "subjectId" text NOT NULL,
    "userId" text NOT NULL,
    rating integer NOT NULL,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);





--
-- Name: Subscription; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Subscription" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "planId" text NOT NULL,
    status public."SubscriptionStatus" DEFAULT :'INACTIVE_STATUS'::public."SubscriptionStatus" NOT NULL,
    "startDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "gracePeriodEndDate" timestamp(3) without time zone
);


--
-- Name: SubscriptionPlan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SubscriptionPlan" (
    id uuid NOT NULL,
    name text NOT NULL,
    "nameAr" text,
    description text,
    "descriptionAr" text,
    price double precision NOT NULL,
    currency text DEFAULT 'EGP'::text NOT NULL,
    "interval" public."PlanInterval" DEFAULT 'MONTHLY'::public."PlanInterval" NOT NULL,
    features text[] DEFAULT ARRAY[]::text[],
    "featuresAr" text[] DEFAULT ARRAY[]::text[],
    "isActive" boolean DEFAULT true NOT NULL,
    level integer DEFAULT 0 NOT NULL,
    "memberLimit" integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "aiMessageLimit" integer,
    "examLimit" integer,
    "extraExamPrice" double precision DEFAULT 0,
    deleted_at timestamp with time zone,
    CONSTRAINT chk_plan_price_nonnegative CHECK ((price >= (0)::double precision))
);


--
-- Name: COLUMN "SubscriptionPlan".deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."SubscriptionPlan".deleted_at IS :'SOFT_DELETE_COMMENT';


--
-- Name: SystemSetting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SystemSetting" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(100) NOT NULL,
    value text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


--
-- Name: Task; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Task" (
    id uuid NOT NULL,
    user_id uuid CONSTRAINT "Task_userId_not_null" NOT NULL,
    title text NOT NULL,
    description text,
    subject_id uuid,
    due_at timestamp with time zone,
    "scheduledAt" timestamp(3) without time zone,
    completed_at timestamp(3) without time zone,
    priority text DEFAULT :'MEDIUM_VAL'::text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    status public."TaskStatus" DEFAULT :'PENDING_STATUS'::public."TaskStatus" NOT NULL,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    estimated_time bigint,
    actual_time bigint,
    deleted_at timestamp with time zone
);


--
-- Name: COLUMN "Task".deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Task".deleted_at IS :'SOFT_DELETE_COMMENT';


--
-- Name: Teacher; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Teacher" (
    id text NOT NULL,
    "userId" text NOT NULL,
    name text NOT NULL,
    bio text,
    image text,
    "onlineUrl" text,
    rating double precision DEFAULT 0.0 NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TeacherEarnings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TeacherEarnings" (
    id text NOT NULL,
    "teacherId" text NOT NULL,
    balance double precision DEFAULT 0 NOT NULL,
    "totalEarned" double precision DEFAULT 0 NOT NULL,
    "withdrawnAmount" double precision DEFAULT 0 NOT NULL,
    currency text DEFAULT 'EGP'::text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TestResult; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TestResult" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "examId" text NOT NULL,
    score double precision NOT NULL,
    "totalScore" double precision NOT NULL,
    answers text NOT NULL,
    "timeTaken" integer NOT NULL,
    "completedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Topic; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Topic" (
    id uuid NOT NULL,
    subject_id uuid CONSTRAINT "Topic_subjectId_not_null" NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    description text,
    "order" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone
);


--
-- Name: TopicProgress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TopicProgress" (
    id text NOT NULL,
    user_id uuid CONSTRAINT "TopicProgress_userId_not_null" NOT NULL,
    sub_topic_id uuid CONSTRAINT "TopicProgress_subTopicId_not_null" NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    completed_at timestamp(3) without time zone,
    "lastVideoPosition" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    status text DEFAULT 'NOT_STARTED'::text,
    time_spent_seconds bigint DEFAULT 0,
    last_watched_position bigint DEFAULT 0
);


--
-- Name: COLUMN "TopicProgress".deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."TopicProgress".deleted_at IS :'SOFT_DELETE_COMMENT';


--
-- Name: TwoFactorChallenge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TwoFactorChallenge" (
    id text NOT NULL,
    "userId" text,
    code text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: UserAchievement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserAchievement" (
    id uuid NOT NULL,
    user_id uuid CONSTRAINT "UserAchievement_userId_not_null" NOT NULL,
    "achievementKey" text NOT NULL,
    "earnedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "UserAchievement_createdAt_not_null" NOT NULL,
    updated_at timestamp(3) without time zone CONSTRAINT "UserAchievement_updatedAt_not_null" NOT NULL,
    deleted_at timestamp with time zone,
    achievement_id uuid NOT NULL,
    unlocked_at timestamp with time zone
);


--
-- Name: UserActivity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserActivity" (
    "userId" text NOT NULL,
    "currentStreak" integer DEFAULT 0 NOT NULL,
    "longestStreak" integer DEFAULT 0 NOT NULL,
    "totalStudyTime" integer DEFAULT 0 NOT NULL,
    "tasksCompleted" integer DEFAULT 0 NOT NULL,
    "examsPassed" integer DEFAULT 0 NOT NULL,
    "pomodoroSessions" integer DEFAULT 0 NOT NULL,
    "deepWorkSessions" integer DEFAULT 0 NOT NULL,
    "lastActiveAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: UserChallenge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserChallenge" (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    challenge_id uuid NOT NULL,
    progress bigint DEFAULT 0,
    is_completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    deleted_at timestamp with time zone
);


--
-- Name: UserGrade; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserGrade" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "subjectId" text NOT NULL,
    grade double precision NOT NULL,
    "maxGrade" double precision NOT NULL,
    "examName" text,
    date timestamp(3) without time zone,
    "examDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: UserInteraction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserInteraction" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    "itemType" text NOT NULL,
    "itemId" text NOT NULL,
    metadata text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: UserReward; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserReward" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "rewardId" text NOT NULL,
    "earnedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    source text,
    "nftTokenId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: UserSettings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserSettings" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    theme text DEFAULT 'light'::text,
    "fontSize" text DEFAULT :'MEDIUM_LOWER'::text,
    "reducedMotion" boolean DEFAULT false,
    "highContrast" boolean DEFAULT false,
    "compactMode" boolean DEFAULT false,
    "efficiencyMode" boolean DEFAULT false,
    language text DEFAULT 'ar'::text,
    "numberFormat" text DEFAULT 'english'::text,
    "notificationsEnabled" boolean DEFAULT true,
    "studyReminders" boolean DEFAULT true,
    "emailNotifications" boolean DEFAULT true,
    "pushNotifications" boolean DEFAULT true,
    "profileVisibility" text DEFAULT 'public'::text,
    "showOnlineStatus" boolean DEFAULT true,
    "showProgress" boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    "deletedAt" timestamp with time zone,
    user_id uuid CONSTRAINT "UserSettings_userId_not_null" NOT NULL,
    "taskReminders" boolean DEFAULT true,
    "taskReminderTime" text DEFAULT '30'::text,
    "dailyGoalReminders" boolean DEFAULT true,
    "examReminders" boolean DEFAULT true,
    "examReminderDays" bigint DEFAULT 3,
    "deadlineReminders" boolean DEFAULT true,
    "progressReports" boolean DEFAULT true,
    "weeklyReport" boolean DEFAULT true,
    "achievementAlerts" boolean DEFAULT true,
    "commentNotifications" boolean DEFAULT true,
    "mentionNotifications" boolean DEFAULT true,
    "pushEnabled" boolean DEFAULT true,
    "emailEnabled" boolean DEFAULT true,
    "smsEnabled" boolean DEFAULT false,
    "quietHoursEnabled" boolean DEFAULT false,
    "quietHoursStart" text DEFAULT '22:00'::text,
    "quietHoursEnd" text DEFAULT '07:00'::text,
    "soundEnabled" boolean DEFAULT true,
    "vibrationEnabled" boolean DEFAULT true,
    deleted_at timestamp with time zone,
    font_size text DEFAULT :'MEDIUM_LOWER'::text,
    reduced_motion boolean DEFAULT false,
    high_contrast boolean DEFAULT false,
    compact_mode boolean DEFAULT false,
    efficiency_mode boolean DEFAULT false,
    number_format text DEFAULT 'english'::text,
    notifications_enabled boolean DEFAULT true,
    study_reminders boolean DEFAULT true,
    email_notifications boolean DEFAULT true,
    push_notifications boolean DEFAULT true,
    task_reminders boolean DEFAULT true,
    task_reminder_time text DEFAULT '30'::text,
    daily_goal_reminders boolean DEFAULT true,
    exam_reminders boolean DEFAULT true,
    exam_reminder_days bigint DEFAULT 3,
    deadline_reminders boolean DEFAULT true,
    progress_reports boolean DEFAULT true,
    weekly_report boolean DEFAULT true,
    achievement_alerts boolean DEFAULT true,
    comment_notifications boolean DEFAULT true,
    mention_notifications boolean DEFAULT true,
    push_enabled boolean DEFAULT true,
    email_enabled boolean DEFAULT true,
    sms_enabled boolean DEFAULT false,
    quiet_hours_enabled boolean DEFAULT false,
    quiet_hours_start text DEFAULT '22:00'::text,
    quiet_hours_end text DEFAULT '07:00'::text,
    sound_enabled boolean DEFAULT true,
    vibration_enabled boolean DEFAULT true,
    profile_visibility text DEFAULT 'public'::text,
    show_online_status boolean DEFAULT true,
    show_progress boolean DEFAULT true
);


--
-- Name: COLUMN "UserSettings".deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."UserSettings".deleted_at IS :'SOFT_DELETE_COMMENT';


--
-- Name: UserWallet; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserWallet" (
    "userId" text NOT NULL,
    balance double precision DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    currency text DEFAULT 'EGP'::text NOT NULL
);


--
-- Name: UserXP; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserXP" (
    "userId" text NOT NULL,
    "totalXP" integer DEFAULT 0 NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    "studyXP" integer DEFAULT 0 NOT NULL,
    "taskXP" integer DEFAULT 0 NOT NULL,
    "examXP" integer DEFAULT 0 NOT NULL,
    "challengeXP" integer DEFAULT 0 NOT NULL,
    "questXP" integer DEFAULT 0 NOT NULL,
    "seasonXP" integer DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: WalletTransaction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WalletTransaction" (
    id uuid NOT NULL,
    "walletId" text NOT NULL,
    user_id uuid CONSTRAINT "WalletTransaction_userId_not_null" NOT NULL,
    amount double precision NOT NULL,
    type public."WalletTransactionType" NOT NULL,
    status public."WalletTransactionStatus" DEFAULT :'COMPLETED_STATUS'::public."WalletTransactionStatus" NOT NULL,
    description text,
    "paymentId" text,
    metadata text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "WalletTransaction_createdAt_not_null" NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT chk_wallet_txn_amount_nonzero CHECK ((amount <> (0)::double precision))
);


--
-- Name: COLUMN "WalletTransaction".deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."WalletTransaction".deleted_at IS :'SOFT_DELETE_COMMENT';


--
-- Name: _GroupMembers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_GroupMembers" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


--
-- Name: _SubjectToTeacher; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_SubjectToTeacher" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: examresult_p2026_02; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.examresult_p2026_02 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT "ExamResult_New_id_not_null" NOT NULL,
    user_id uuid CONSTRAINT "ExamResult_New_user_id_not_null" NOT NULL,
    exam_id uuid CONSTRAINT "ExamResult_New_exam_id_not_null" NOT NULL,
    score numeric DEFAULT 0,
    max_score double precision DEFAULT 0,
    passed boolean DEFAULT false,
    answers text,
    taken_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "ExamResult_New_taken_at_not_null" NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


--
-- Name: examresult_p2026_03; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.examresult_p2026_03 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT "ExamResult_id_not_null" NOT NULL,
    user_id uuid CONSTRAINT "ExamResult_user_id_not_null" NOT NULL,
    exam_id uuid CONSTRAINT "ExamResult_exam_id_not_null" NOT NULL,
    score numeric DEFAULT 0,
    max_score double precision DEFAULT 0,
    passed boolean DEFAULT false,
    answers text,
    taken_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "ExamResult_taken_at_not_null" NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


--
-- Name: examresult_p2026_04; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.examresult_p2026_04 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT "ExamResult_id_not_null" NOT NULL,
    user_id uuid CONSTRAINT "ExamResult_user_id_not_null" NOT NULL,
    exam_id uuid CONSTRAINT "ExamResult_exam_id_not_null" NOT NULL,
    score numeric DEFAULT 0,
    max_score double precision DEFAULT 0,
    passed boolean DEFAULT false,
    answers text,
    taken_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "ExamResult_taken_at_not_null" NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


--
-- Name: examresult_p2026_05; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.examresult_p2026_05 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT "ExamResult_id_not_null" NOT NULL,
    user_id uuid CONSTRAINT "ExamResult_user_id_not_null" NOT NULL,
    exam_id uuid CONSTRAINT "ExamResult_exam_id_not_null" NOT NULL,
    score numeric DEFAULT 0,
    max_score double precision DEFAULT 0,
    passed boolean DEFAULT false,
    answers text,
    taken_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "ExamResult_taken_at_not_null" NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


--
-- Name: examresult_p2026_06; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.examresult_p2026_06 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT "ExamResult_id_not_null" NOT NULL,
    user_id uuid CONSTRAINT "ExamResult_user_id_not_null" NOT NULL,
    exam_id uuid CONSTRAINT "ExamResult_exam_id_not_null" NOT NULL,
    score numeric DEFAULT 0,
    max_score double precision DEFAULT 0,
    passed boolean DEFAULT false,
    answers text,
    taken_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "ExamResult_taken_at_not_null" NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


--
-- Name: examresult_p2026_07; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.examresult_p2026_07 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT "ExamResult_id_not_null" NOT NULL,
    user_id uuid CONSTRAINT "ExamResult_user_id_not_null" NOT NULL,
    exam_id uuid CONSTRAINT "ExamResult_exam_id_not_null" NOT NULL,
    score numeric DEFAULT 0,
    max_score double precision DEFAULT 0,
    passed boolean DEFAULT false,
    answers text,
    taken_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "ExamResult_taken_at_not_null" NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


--
-- Name: examresult_p2026_08; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.examresult_p2026_08 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT "ExamResult_id_not_null" NOT NULL,
    user_id uuid CONSTRAINT "ExamResult_user_id_not_null" NOT NULL,
    exam_id uuid CONSTRAINT "ExamResult_exam_id_not_null" NOT NULL,
    score numeric DEFAULT 0,
    max_score double precision DEFAULT 0,
    passed boolean DEFAULT false,
    answers text,
    taken_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "ExamResult_taken_at_not_null" NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);

CREATE TABLE public.examresult_p2026_09 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT "ExamResult_p2026_09_id_not_null" NOT NULL,
    user_id uuid CONSTRAINT "ExamResult_p2026_09_user_id_not_null" NOT NULL,
    exam_id uuid CONSTRAINT "ExamResult_p2026_09_exam_id_not_null" NOT NULL,
    score numeric DEFAULT 0,
    max_score double precision DEFAULT 0,
    passed boolean DEFAULT false,
    answers text,
    taken_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "ExamResult_p2026_09_taken_at_not_null" NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);

CREATE TABLE public.examresult_p2026_10 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT "ExamResult_p2026_10_id_not_null" NOT NULL,
    user_id uuid CONSTRAINT "ExamResult_p2026_10_user_id_not_null" NOT NULL,
    exam_id uuid CONSTRAINT "ExamResult_p2026_10_exam_id_not_null" NOT NULL,
    score numeric DEFAULT 0,
    max_score double precision DEFAULT 0,
    passed boolean DEFAULT false,
    answers text,
    taken_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "ExamResult_p2026_10_taken_at_not_null" NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);

CREATE TABLE public.examresult_p2026_11 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT "ExamResult_p2026_11_id_not_null" NOT NULL,
    user_id uuid CONSTRAINT "ExamResult_p2026_11_user_id_not_null" NOT NULL,
    exam_id uuid CONSTRAINT "ExamResult_p2026_11_exam_id_not_null" NOT NULL,
    score numeric DEFAULT 0,
    max_score double precision DEFAULT 0,
    passed boolean DEFAULT false,
    answers text,
    taken_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "ExamResult_p2026_11_taken_at_not_null" NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);

CREATE TABLE public.examresult_p2026_12 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT "ExamResult_p2026_12_id_not_null" NOT NULL,
    user_id uuid CONSTRAINT "ExamResult_p2026_12_user_id_not_null" NOT NULL,
    exam_id uuid CONSTRAINT "ExamResult_p2026_12_exam_id_not_null" NOT NULL,
    score numeric DEFAULT 0,
    max_score double precision DEFAULT 0,
    passed boolean DEFAULT false,
    answers text,
    taken_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "ExamResult_p2026_12_taken_at_not_null" NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


--
-- Name: examresult_pdefault; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.examresult_pdefault (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT "ExamResult_id_not_null" NOT NULL,
    user_id uuid CONSTRAINT "ExamResult_user_id_not_null" NOT NULL,
    exam_id uuid CONSTRAINT "ExamResult_exam_id_not_null" NOT NULL,
    score numeric DEFAULT 0,
    max_score double precision DEFAULT 0,
    passed boolean DEFAULT false,
    answers text,
    taken_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "ExamResult_taken_at_not_null" NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions (
    id text NOT NULL,
    exam_id text NOT NULL,
    text text NOT NULL,
    type text,
    options text,
    answer text
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    id text NOT NULL,
    checksum text NOT NULL,
    "appliedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: examresult_p2026_02; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExamResult" ATTACH PARTITION public.examresult_p2026_02 FOR VALUES FROM ('2026-02-01 00:00:00+02') TO ('2026-03-01 00:00:00+02');


--
-- Name: examresult_p2026_03; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExamResult" ATTACH PARTITION public.examresult_p2026_03 FOR VALUES FROM ('2026-03-01 00:00:00+02') TO ('2026-04-01 00:00:00+02');


--
-- Name: examresult_p2026_04; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExamResult" ATTACH PARTITION public.examresult_p2026_04 FOR VALUES FROM ('2026-04-01 00:00:00+02') TO ('2026-05-01 00:00:00+03');


--
-- Name: examresult_p2026_05; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExamResult" ATTACH PARTITION public.examresult_p2026_05 FOR VALUES FROM ('2026-05-01 00:00:00+03') TO ('2026-06-01 00:00:00+03');


--
-- Name: examresult_p2026_06; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExamResult" ATTACH PARTITION public.examresult_p2026_06 FOR VALUES FROM ('2026-06-01 00:00:00+03') TO ('2026-07-01 00:00:00+03');


--
-- Name: examresult_p2026_07; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExamResult" ATTACH PARTITION public.examresult_p2026_07 FOR VALUES FROM ('2026-07-01 00:00:00+03') TO ('2026-08-01 00:00:00+03');


--
-- Name: examresult_p2026_08; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExamResult" ATTACH PARTITION public.examresult_p2026_08 FOR VALUES FROM ('2026-08-01 00:00:00+03') TO ('2026-09-01 00:00:00+03');
ALTER TABLE ONLY public."ExamResult" ATTACH PARTITION public.examresult_p2026_09 FOR VALUES FROM ('2026-09-01 00:00:00+03') TO ('2026-10-01 00:00:00+03');
ALTER TABLE ONLY public."ExamResult" ATTACH PARTITION public.examresult_p2026_10 FOR VALUES FROM ('2026-10-01 00:00:00+03') TO ('2026-11-01 00:00:00+02');
ALTER TABLE ONLY public."ExamResult" ATTACH PARTITION public.examresult_p2026_11 FOR VALUES FROM ('2026-11-01 00:00:00+02') TO ('2026-12-01 00:00:00+02');
ALTER TABLE ONLY public."ExamResult" ATTACH PARTITION public.examresult_p2026_12 FOR VALUES FROM ('2026-12-01 00:00:00+02') TO ('2027-01-01 00:00:00+02');


--
-- Name: examresult_pdefault; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExamResult" ATTACH PARTITION public.examresult_pdefault DEFAULT;


--
-- Name: ABExperiment ABExperiment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ABExperiment"
    ADD CONSTRAINT "ABExperiment_pkey" PRIMARY KEY (id);


--
-- Name: Achievement Achievement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Achievement"
    ADD CONSTRAINT "Achievement_pkey" PRIMARY KEY (id);


--
-- Name: Addon Addon_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Addon"
    ADD CONSTRAINT "Addon_pkey" PRIMARY KEY (id);


--
-- Name: AiChatMessage AiChatMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AiChatMessage"
    ADD CONSTRAINT "AiChatMessage_pkey" PRIMARY KEY (id);


--
-- Name: AiGeneratedContent AiGeneratedContent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AiGeneratedContent"
    ADD CONSTRAINT "AiGeneratedContent_pkey" PRIMARY KEY (id);


--
-- Name: AiGeneratedExam AiGeneratedExam_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AiGeneratedExam"
    ADD CONSTRAINT "AiGeneratedExam_pkey" PRIMARY KEY (id);


--
-- Name: AiQuestion AiQuestion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AiQuestion"
    ADD CONSTRAINT "AiQuestion_pkey" PRIMARY KEY (id);


--
-- Name: AnalyticsEvent AnalyticsEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AnalyticsEvent"
    ADD CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY (id);


--
-- Name: Announcement Announcement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Announcement"
    ADD CONSTRAINT "Announcement_pkey" PRIMARY KEY (id);


--
-- Name: AutomationLog AutomationLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AutomationLog"
    ADD CONSTRAINT "AutomationLog_pkey" PRIMARY KEY (id);


--
-- Name: AutomationRule AutomationRule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AutomationRule"
    ADD CONSTRAINT "AutomationRule_pkey" PRIMARY KEY (id);


--
-- Name: Automation Automation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Automation"
    ADD CONSTRAINT "Automation_pkey" PRIMARY KEY (id);


--
-- Name: BiometricChallenge BiometricChallenge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BiometricChallenge"
    ADD CONSTRAINT "BiometricChallenge_pkey" PRIMARY KEY (id);


--
-- Name: BiometricCredential BiometricCredential_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BiometricCredential"
    ADD CONSTRAINT "BiometricCredential_pkey" PRIMARY KEY (id);


--
-- Name: BlogPost BlogPost_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BlogPost"
    ADD CONSTRAINT "BlogPost_pkey" PRIMARY KEY (id);


--
-- Name: BookProgress BookProgress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BookProgress"
    ADD CONSTRAINT "BookProgress_pkey" PRIMARY KEY (id);


--
-- Name: BookReview BookReview_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BookReview"
    ADD CONSTRAINT "BookReview_pkey" PRIMARY KEY (id);


--
-- Name: Book Book_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Book"
    ADD CONSTRAINT "Book_pkey" PRIMARY KEY (id);


--
-- Name: Category Category_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);


--
-- Name: ChallengeCompletion ChallengeCompletion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChallengeCompletion"
    ADD CONSTRAINT "ChallengeCompletion_pkey" PRIMARY KEY (id);


--
-- Name: Challenge Challenge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Challenge"
    ADD CONSTRAINT "Challenge_pkey" PRIMARY KEY (id);


--
-- Name: ContentPreference ContentPreference_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContentPreference"
    ADD CONSTRAINT "ContentPreference_pkey" PRIMARY KEY (id);


--
-- Name: ContentReport ContentReport_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContentReport"
    ADD CONSTRAINT "ContentReport_pkey" PRIMARY KEY (id);


--
-- Name: ContestQuestion ContestQuestion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContestQuestion"
    ADD CONSTRAINT "ContestQuestion_pkey" PRIMARY KEY (id);


--
-- Name: Contest Contest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Contest"
    ADD CONSTRAINT "Contest_pkey" PRIMARY KEY (id);


--
-- Name: Coupon Coupon_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Coupon"
    ADD CONSTRAINT "Coupon_pkey" PRIMARY KEY (id);


--
-- Name: CourseReview CourseReview_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseReview"
    ADD CONSTRAINT "CourseReview_pkey" PRIMARY KEY (id);


--
-- Name: CustomGoal CustomGoal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CustomGoal"
    ADD CONSTRAINT "CustomGoal_pkey" PRIMARY KEY (id);


--
-- Name: DeletedRecordArchive DeletedRecordArchive_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DeletedRecordArchive"
    ADD CONSTRAINT "DeletedRecordArchive_pkey" PRIMARY KEY (id);


--
-- Name: EventAttendee EventAttendee_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EventAttendee"
    ADD CONSTRAINT "EventAttendee_pkey" PRIMARY KEY (id);


--
-- Name: Event Event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_pkey" PRIMARY KEY (id);


--
-- Name: ExamResult ExamResult_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExamResult"
    ADD CONSTRAINT "ExamResult_pkey" PRIMARY KEY (id, taken_at);


--
-- Name: Exam Exam_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Exam"
    ADD CONSTRAINT "Exam_pkey" PRIMARY KEY (id);


--
-- Name: Experiment Experiment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Experiment"
    ADD CONSTRAINT "Experiment_pkey" PRIMARY KEY (id);


--
-- Name: ForumCategory ForumCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ForumCategory"
    ADD CONSTRAINT "ForumCategory_pkey" PRIMARY KEY (id);


--
-- Name: ForumPost ForumPost_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ForumPost"
    ADD CONSTRAINT "ForumPost_pkey" PRIMARY KEY (id);


--
-- Name: ForumReply ForumReply_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ForumReply"
    ADD CONSTRAINT "ForumReply_pkey" PRIMARY KEY (id);


--
-- Name: ForumTopic ForumTopic_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ForumTopic"
    ADD CONSTRAINT "ForumTopic_pkey" PRIMARY KEY (id);


--
-- Name: GroupSubscription GroupSubscription_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GroupSubscription"
    ADD CONSTRAINT "GroupSubscription_pkey" PRIMARY KEY (id);


--
-- Name: Invoice Invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY (id);


--
-- Name: LeaderboardEntry LeaderboardEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LeaderboardEntry"
    ADD CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY (id);


--
-- Name: LessonAnswer LessonAnswer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LessonAnswer"
    ADD CONSTRAINT "LessonAnswer_pkey" PRIMARY KEY (id);


--
-- Name: LessonAttachment LessonAttachment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LessonAttachment"
    ADD CONSTRAINT "LessonAttachment_pkey" PRIMARY KEY (id);


--
-- Name: LessonNote LessonNote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LessonNote"
    ADD CONSTRAINT "LessonNote_pkey" PRIMARY KEY (id);


--
-- Name: LessonQuestion LessonQuestion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LessonQuestion"
    ADD CONSTRAINT "LessonQuestion_pkey" PRIMARY KEY (id);


--
-- Name: LiveEvent LiveEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LiveEvent"
    ADD CONSTRAINT "LiveEvent_pkey" PRIMARY KEY (id);


--
-- Name: MarketingCampaign MarketingCampaign_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MarketingCampaign"
    ADD CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY (id);


--
-- Name: Message Message_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_pkey" PRIMARY KEY (id);


--
-- Name: MlRecommendation MlRecommendation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MlRecommendation"
    ADD CONSTRAINT "MlRecommendation_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: OfflineLesson OfflineLesson_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OfflineLesson"
    ADD CONSTRAINT "OfflineLesson_pkey" PRIMARY KEY (id);


--
-- Name: PasswordHistory PasswordHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasswordHistory"
    ADD CONSTRAINT "PasswordHistory_pkey" PRIMARY KEY (id);


--
-- Name: PasswordPolicy PasswordPolicy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasswordPolicy"
    ADD CONSTRAINT "PasswordPolicy_pkey" PRIMARY KEY (id);


--
-- Name: PaymentStatusLookup PaymentStatusLookup_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentStatusLookup"
    ADD CONSTRAINT "PaymentStatusLookup_pkey" PRIMARY KEY (code);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: ProgressSnapshot ProgressSnapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProgressSnapshot"
    ADD CONSTRAINT "ProgressSnapshot_pkey" PRIMARY KEY (id);


--
-- Name: QuestChain QuestChain_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QuestChain"
    ADD CONSTRAINT "QuestChain_pkey" PRIMARY KEY (id);


--
-- Name: QuestProgress QuestProgress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QuestProgress"
    ADD CONSTRAINT "QuestProgress_pkey" PRIMARY KEY (id);


--
-- Name: Quest Quest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Quest"
    ADD CONSTRAINT "Quest_pkey" PRIMARY KEY (id);


--
-- Name: Question Question_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Question"
    ADD CONSTRAINT "Question_pkey" PRIMARY KEY (id);


--
-- Name: ReferralReward ReferralReward_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReferralReward"
    ADD CONSTRAINT "ReferralReward_pkey" PRIMARY KEY (id);


--
-- Name: Reminder Reminder_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Reminder"
    ADD CONSTRAINT "Reminder_pkey" PRIMARY KEY (id);


--
-- Name: Resource Resource_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Resource"
    ADD CONSTRAINT "Resource_pkey" PRIMARY KEY (id);


--
-- Name: Reward Reward_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Reward"
    ADD CONSTRAINT "Reward_pkey" PRIMARY KEY (id);


--
-- Name: Schedule Schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Schedule"
    ADD CONSTRAINT "Schedule_pkey" PRIMARY KEY (id);


--
-- Name: SeasonParticipation SeasonParticipation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SeasonParticipation"
    ADD CONSTRAINT "SeasonParticipation_pkey" PRIMARY KEY (id);


--
-- Name: Season Season_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Season"
    ADD CONSTRAINT "Season_pkey" PRIMARY KEY (id);


--
-- Name: SecurityLog SecurityLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SecurityLog"
    ADD CONSTRAINT "SecurityLog_pkey" PRIMARY KEY (id);


--
-- Name: SecurityQuestion SecurityQuestion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SecurityQuestion"
    ADD CONSTRAINT "SecurityQuestion_pkey" PRIMARY KEY (id);


--
-- Name: SentimentAnalysis SentimentAnalysis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SentimentAnalysis"
    ADD CONSTRAINT "SentimentAnalysis_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: StudySession StudySession_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudySession"
    ADD CONSTRAINT "StudySession_pkey" PRIMARY KEY (id);


--
-- Name: SubTopic SubTopic_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SubTopic"
    ADD CONSTRAINT "SubTopic_pkey" PRIMARY KEY (id);


--
-- Name: SubjectCertificate SubjectCertificate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SubjectCertificate"
    ADD CONSTRAINT "SubjectCertificate_pkey" PRIMARY KEY (id);


--
-- Name: SubjectEnrollment SubjectEnrollment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SubjectEnrollment"
    ADD CONSTRAINT "SubjectEnrollment_pkey" PRIMARY KEY (id);


--
-- Name: SubjectReview SubjectReview_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SubjectReview"
    ADD CONSTRAINT "SubjectReview_pkey" PRIMARY KEY (id);


--
-- Name: Subject Subject_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Subject"
    ADD CONSTRAINT "Subject_pkey" PRIMARY KEY (id);


--
-- Name: SubscriptionPlan SubscriptionPlan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SubscriptionPlan"
    ADD CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY (id);


--
-- Name: Subscription Subscription_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_pkey" PRIMARY KEY (id);


--
-- Name: SystemSetting SystemSetting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SystemSetting"
    ADD CONSTRAINT "SystemSetting_key_key" UNIQUE (key);


--
-- Name: SystemSetting SystemSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SystemSetting"
    ADD CONSTRAINT "SystemSetting_pkey" PRIMARY KEY (id);


--
-- Name: Task Task_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_pkey" PRIMARY KEY (id);


--
-- Name: TeacherEarnings TeacherEarnings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeacherEarnings"
    ADD CONSTRAINT "TeacherEarnings_pkey" PRIMARY KEY (id);


--
-- Name: Teacher Teacher_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Teacher"
    ADD CONSTRAINT "Teacher_pkey" PRIMARY KEY (id);


--
-- Name: TestResult TestResult_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TestResult"
    ADD CONSTRAINT "TestResult_pkey" PRIMARY KEY (id);


--
-- Name: TopicProgress TopicProgress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TopicProgress"
    ADD CONSTRAINT "TopicProgress_pkey" PRIMARY KEY (id);


--
-- Name: Topic Topic_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Topic"
    ADD CONSTRAINT "Topic_pkey" PRIMARY KEY (id);


--
-- Name: TwoFactorChallenge TwoFactorChallenge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TwoFactorChallenge"
    ADD CONSTRAINT "TwoFactorChallenge_pkey" PRIMARY KEY (id);


--
-- Name: UserAchievement UserAchievement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserAchievement"
    ADD CONSTRAINT "UserAchievement_pkey" PRIMARY KEY (id);


--
-- Name: UserActivity UserActivity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserActivity"
    ADD CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("userId");


--
-- Name: UserChallenge UserChallenge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserChallenge"
    ADD CONSTRAINT "UserChallenge_pkey" PRIMARY KEY (id);


--
-- Name: UserGrade UserGrade_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserGrade"
    ADD CONSTRAINT "UserGrade_pkey" PRIMARY KEY (id);


--
-- Name: UserInteraction UserInteraction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserInteraction"
    ADD CONSTRAINT "UserInteraction_pkey" PRIMARY KEY (id);


--
-- Name: UserReward UserReward_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserReward"
    ADD CONSTRAINT "UserReward_pkey" PRIMARY KEY (id);


--
-- Name: UserSettings UserSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserSettings"
    ADD CONSTRAINT "UserSettings_pkey" PRIMARY KEY (id);


--
-- Name: UserWallet UserWallet_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserWallet"
    ADD CONSTRAINT "UserWallet_pkey" PRIMARY KEY ("userId");


--
-- Name: UserXP UserXP_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserXP"
    ADD CONSTRAINT "UserXP_pkey" PRIMARY KEY ("userId");


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: WalletTransaction WalletTransaction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WalletTransaction"
    ADD CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY (id);


--
-- Name: _GroupMembers _GroupMembers_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_GroupMembers"
    ADD CONSTRAINT "_GroupMembers_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _SubjectToTeacher _SubjectToTeacher_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_SubjectToTeacher"
    ADD CONSTRAINT "_SubjectToTeacher_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: examresult_p2026_02 examresult_p2026_02_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.examresult_p2026_02
    ADD CONSTRAINT examresult_p2026_02_pkey PRIMARY KEY (id, taken_at);


--
-- Name: examresult_p2026_03 examresult_p2026_03_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.examresult_p2026_03
    ADD CONSTRAINT examresult_p2026_03_pkey PRIMARY KEY (id, taken_at);


--
-- Name: examresult_p2026_04 examresult_p2026_04_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.examresult_p2026_04
    ADD CONSTRAINT examresult_p2026_04_pkey PRIMARY KEY (id, taken_at);


--
-- Name: examresult_p2026_05 examresult_p2026_05_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.examresult_p2026_05
    ADD CONSTRAINT examresult_p2026_05_pkey PRIMARY KEY (id, taken_at);


--
-- Name: examresult_p2026_06 examresult_p2026_06_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.examresult_p2026_06
    ADD CONSTRAINT examresult_p2026_06_pkey PRIMARY KEY (id, taken_at);


--
-- Name: examresult_p2026_07 examresult_p2026_07_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.examresult_p2026_07
    ADD CONSTRAINT examresult_p2026_07_pkey PRIMARY KEY (id, taken_at);


--
-- Name: examresult_p2026_08 examresult_p2026_08_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.examresult_p2026_08
    ADD CONSTRAINT examresult_p2026_08_pkey PRIMARY KEY (id, taken_at);

ALTER TABLE ONLY public.examresult_p2026_09
    ADD CONSTRAINT examresult_p2026_09_pkey PRIMARY KEY (id, taken_at);

ALTER TABLE ONLY public.examresult_p2026_10
    ADD CONSTRAINT examresult_p2026_10_pkey PRIMARY KEY (id, taken_at);

ALTER TABLE ONLY public.examresult_p2026_11
    ADD CONSTRAINT examresult_p2026_11_pkey PRIMARY KEY (id, taken_at);

ALTER TABLE ONLY public.examresult_p2026_12
    ADD CONSTRAINT examresult_p2026_12_pkey PRIMARY KEY (id, taken_at);


--
-- Name: examresult_pdefault examresult_pdefault_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.examresult_pdefault
    ADD CONSTRAINT examresult_pdefault_pkey PRIMARY KEY (id, taken_at);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- Name: TopicProgress unique_user_lesson; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TopicProgress"
    ADD CONSTRAINT unique_user_lesson UNIQUE (user_id, sub_topic_id);


--
-- Name: TopicProgress unique_user_lesson_snake; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TopicProgress"
    ADD CONSTRAINT unique_user_lesson_snake UNIQUE (user_id, sub_topic_id);


--
-- Name: UserSettings unique_user_settings; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserSettings"
    ADD CONSTRAINT unique_user_settings UNIQUE (user_id);




--
-- Name: Achievement_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Achievement_key_key" ON public."Achievement" USING btree (key);


--
-- Name: Addon_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Addon_name_key" ON public."Addon" USING btree (name);


--
-- Name: AiChatMessage_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiChatMessage_userId_idx" ON public."AiChatMessage" USING btree ("userId");


--
-- Name: AiGeneratedContent_subjectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiGeneratedContent_subjectId_idx" ON public."AiGeneratedContent" USING btree ("subjectId");


--
-- Name: AiGeneratedContent_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiGeneratedContent_userId_idx" ON public."AiGeneratedContent" USING btree ("userId");


--
-- Name: AiGeneratedExam_subjectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiGeneratedExam_subjectId_idx" ON public."AiGeneratedExam" USING btree ("subjectId");


--
-- Name: AiGeneratedExam_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiGeneratedExam_userId_idx" ON public."AiGeneratedExam" USING btree ("userId");


--
-- Name: AiQuestion_examId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiQuestion_examId_idx" ON public."AiQuestion" USING btree ("examId");


--
-- Name: AnalyticsEvent_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AnalyticsEvent_type_idx" ON public."AnalyticsEvent" USING btree (type);


--
-- Name: AnalyticsEvent_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AnalyticsEvent_userId_idx" ON public."AnalyticsEvent" USING btree ("userId");


--
-- Name: AutomationLog_ruleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AutomationLog_ruleId_idx" ON public."AutomationLog" USING btree ("ruleId");


--
-- Name: AutomationLog_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AutomationLog_userId_idx" ON public."AutomationLog" USING btree ("userId");


--
-- Name: BiometricChallenge_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BiometricChallenge_userId_idx" ON public."BiometricChallenge" USING btree ("userId");


--
-- Name: BiometricCredential_credentialId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BiometricCredential_credentialId_idx" ON public."BiometricCredential" USING btree ("credentialId");


--
-- Name: BiometricCredential_credentialId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "BiometricCredential_credentialId_key" ON public."BiometricCredential" USING btree ("credentialId");


--
-- Name: BiometricCredential_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BiometricCredential_userId_idx" ON public."BiometricCredential" USING btree ("userId");


--
-- Name: BlogPost_authorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BlogPost_authorId_idx" ON public."BlogPost" USING btree ("authorId");


--
-- Name: BlogPost_categoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BlogPost_categoryId_idx" ON public."BlogPost" USING btree ("categoryId");


--
-- Name: BlogPost_isPublished_publishedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BlogPost_isPublished_publishedAt_idx" ON public."BlogPost" USING btree ("isPublished", "publishedAt" DESC);


--
-- Name: BlogPost_publishedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BlogPost_publishedAt_idx" ON public."BlogPost" USING btree ("publishedAt" DESC);


--
-- Name: BlogPost_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "BlogPost_slug_key" ON public."BlogPost" USING btree (slug);


--
-- Name: BookProgress_bookId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BookProgress_bookId_idx" ON public."BookProgress" USING btree ("bookId");


--
-- Name: BookProgress_userId_bookId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "BookProgress_userId_bookId_key" ON public."BookProgress" USING btree ("userId", "bookId");


--
-- Name: BookProgress_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BookProgress_userId_idx" ON public."BookProgress" USING btree ("userId");


--
-- Name: BookReview_bookId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BookReview_bookId_idx" ON public."BookReview" USING btree ("bookId");


--
-- Name: BookReview_bookId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "BookReview_bookId_userId_key" ON public."BookReview" USING btree ("bookId", "userId");


--
-- Name: BookReview_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BookReview_userId_idx" ON public."BookReview" USING btree ("userId");


--
-- Name: Book_createdAt_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Book_createdAt_id_idx" ON public."Book" USING btree ("createdAt" DESC, id DESC);


--
-- Name: Book_subjectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Book_subjectId_idx" ON public."Book" USING btree ("subjectId");


--
-- Name: Book_uploaderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Book_uploaderId_idx" ON public."Book" USING btree ("uploaderId");


--
-- Name: Category_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Category_name_key" ON public."Category" USING btree (name);


--
-- Name: Category_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Category_slug_key" ON public."Category" USING btree (slug);


--
-- Name: ChallengeCompletion_challengeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChallengeCompletion_challengeId_idx" ON public."ChallengeCompletion" USING btree ("challengeId");


--
-- Name: ChallengeCompletion_userId_challengeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ChallengeCompletion_userId_challengeId_key" ON public."ChallengeCompletion" USING btree ("userId", "challengeId");


--
-- Name: ChallengeCompletion_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChallengeCompletion_userId_idx" ON public."ChallengeCompletion" USING btree ("userId");


--
-- Name: Challenge_subjectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Challenge_subjectId_idx" ON public."Challenge" USING btree (subject_id);


--
-- Name: ContentPreference_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContentPreference_userId_idx" ON public."ContentPreference" USING btree ("userId");


--
-- Name: ContentPreference_userId_itemType_itemValue_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ContentPreference_userId_itemType_itemValue_key" ON public."ContentPreference" USING btree ("userId", "itemType", "itemValue");


--
-- Name: ContentReport_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContentReport_status_idx" ON public."ContentReport" USING btree (status);


--
-- Name: ContentReport_targetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContentReport_targetId_idx" ON public."ContentReport" USING btree ("targetId");


--
-- Name: ContentReport_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContentReport_userId_idx" ON public."ContentReport" USING btree ("userId");


--
-- Name: Contest_pinCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Contest_pinCode_key" ON public."Contest" USING btree ("pinCode");


--
-- Name: Contest_startDate_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Contest_startDate_id_idx" ON public."Contest" USING btree ("startDate", id DESC);


--
-- Name: Coupon_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Coupon_code_idx" ON public."Coupon" USING btree (code);


--
-- Name: Coupon_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Coupon_code_key" ON public."Coupon" USING btree (code);


--
-- Name: Coupon_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Coupon_isActive_idx" ON public."Coupon" USING btree (is_active);


--
-- Name: Coupon_userTargetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Coupon_userTargetId_idx" ON public."Coupon" USING btree ("userTargetId");


--
-- Name: CustomGoal_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CustomGoal_userId_idx" ON public."CustomGoal" USING btree ("userId");


--
-- Name: EventAttendee_eventId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EventAttendee_eventId_idx" ON public."EventAttendee" USING btree (event_id);


--
-- Name: EventAttendee_eventId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EventAttendee_eventId_userId_key" ON public."EventAttendee" USING btree (event_id, user_id);


--
-- Name: EventAttendee_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EventAttendee_userId_idx" ON public."EventAttendee" USING btree (user_id);


--
-- Name: Event_organizerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Event_organizerId_idx" ON public."Event" USING btree ("organizerId");


--
-- Name: Exam_subjectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Exam_subjectId_idx" ON public."Exam" USING btree (subject_id);


--
-- Name: Exam_subjectId_year_createdAt_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Exam_subjectId_year_createdAt_id_idx" ON public."Exam" USING btree (subject_id, year DESC, created_at DESC, id DESC);


--
-- Name: Exam_year_createdAt_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Exam_year_createdAt_id_idx" ON public."Exam" USING btree (year DESC, created_at DESC, id DESC);


--
-- Name: ForumPost_authorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ForumPost_authorId_idx" ON public."ForumPost" USING btree ("authorId");


--
-- Name: ForumPost_categoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ForumPost_categoryId_idx" ON public."ForumPost" USING btree ("categoryId");


--
-- Name: ForumPost_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ForumPost_createdAt_idx" ON public."ForumPost" USING btree ("createdAt" DESC);


--
-- Name: ForumPost_isPinned_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ForumPost_isPinned_createdAt_idx" ON public."ForumPost" USING btree ("isPinned", "createdAt" DESC);


--
-- Name: ForumReply_authorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ForumReply_authorId_idx" ON public."ForumReply" USING btree ("authorId");


--
-- Name: ForumReply_postId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ForumReply_postId_idx" ON public."ForumReply" USING btree ("postId");


--
-- Name: GroupSubscription_ownerId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "GroupSubscription_ownerId_key" ON public."GroupSubscription" USING btree ("ownerId");


--
-- Name: Invoice_invoiceNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON public."Invoice" USING btree (invoice_number);


--
-- Name: Invoice_issueDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Invoice_issueDate_idx" ON public."Invoice" USING btree ("issueDate" DESC);


--
-- Name: Invoice_paymentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Invoice_paymentId_key" ON public."Invoice" USING btree (payment_id);


--
-- Name: Invoice_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Invoice_status_idx" ON public."Invoice" USING btree (status);


--
-- Name: Invoice_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Invoice_userId_idx" ON public."Invoice" USING btree (user_id);


--
-- Name: LeaderboardEntry_subjectId_type_period_totalXP_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LeaderboardEntry_subjectId_type_period_totalXP_idx" ON public."LeaderboardEntry" USING btree ("subjectId", type, period, "totalXP" DESC);


--
-- Name: LeaderboardEntry_totalXP_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LeaderboardEntry_totalXP_idx" ON public."LeaderboardEntry" USING btree ("totalXP" DESC);


--
-- Name: LeaderboardEntry_type_period_totalXP_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LeaderboardEntry_type_period_totalXP_idx" ON public."LeaderboardEntry" USING btree (type, period, "totalXP" DESC);


--
-- Name: LeaderboardEntry_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LeaderboardEntry_userId_idx" ON public."LeaderboardEntry" USING btree ("userId");


--
-- Name: LeaderboardEntry_userId_type_period_subjectId_levelRange_se_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "LeaderboardEntry_userId_type_period_subjectId_levelRange_se_key" ON public."LeaderboardEntry" USING btree ("userId", type, period, "subjectId", "levelRange", "seasonId");


--
-- Name: LessonAnswer_questionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LessonAnswer_questionId_idx" ON public."LessonAnswer" USING btree ("questionId");


--
-- Name: LessonAnswer_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LessonAnswer_userId_idx" ON public."LessonAnswer" USING btree ("userId");


--
-- Name: LessonAttachment_subTopicId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LessonAttachment_subTopicId_idx" ON public."LessonAttachment" USING btree ("subTopicId");


--
-- Name: LessonNote_subTopicId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LessonNote_subTopicId_idx" ON public."LessonNote" USING btree ("subTopicId");


--
-- Name: LessonNote_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LessonNote_userId_idx" ON public."LessonNote" USING btree ("userId");


--
-- Name: LessonNote_userId_subTopicId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "LessonNote_userId_subTopicId_key" ON public."LessonNote" USING btree ("userId", "subTopicId");


--
-- Name: LessonQuestion_subTopicId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LessonQuestion_subTopicId_idx" ON public."LessonQuestion" USING btree ("subTopicId");


--
-- Name: LessonQuestion_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LessonQuestion_userId_idx" ON public."LessonQuestion" USING btree ("userId");


--
-- Name: Message_receiverId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Message_receiverId_idx" ON public."Message" USING btree ("receiverId");


--
-- Name: Message_receiverId_isRead_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Message_receiverId_isRead_createdAt_idx" ON public."Message" USING btree ("receiverId", "isRead", "createdAt" DESC);


--
-- Name: Message_receiverId_senderId_createdAt_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Message_receiverId_senderId_createdAt_id_idx" ON public."Message" USING btree ("receiverId", "senderId", "createdAt" DESC, id DESC);


--
-- Name: Message_senderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Message_senderId_idx" ON public."Message" USING btree ("senderId");


--
-- Name: Message_senderId_receiverId_createdAt_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Message_senderId_receiverId_createdAt_id_idx" ON public."Message" USING btree ("senderId", "receiverId", "createdAt" DESC, id DESC);


--
-- Name: Message_senderId_receiverId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Message_senderId_receiverId_createdAt_idx" ON public."Message" USING btree ("senderId", "receiverId", "createdAt" DESC);


--
-- Name: Message_senderId_receiverId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Message_senderId_receiverId_idx" ON public."Message" USING btree ("senderId", "receiverId");


--
-- Name: MlRecommendation_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MlRecommendation_userId_idx" ON public."MlRecommendation" USING btree ("userId");


--
-- Name: Notification_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_createdAt_idx" ON public."Notification" USING btree (created_at DESC);


--
-- Name: Notification_isDeleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_isDeleted_idx" ON public."Notification" USING btree ("isDeleted");


--
-- Name: Notification_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_userId_idx" ON public."Notification" USING btree (user_id);


--
-- Name: Notification_userId_isDeleted_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_userId_isDeleted_createdAt_idx" ON public."Notification" USING btree (user_id, "isDeleted", created_at DESC);


--
-- Name: Notification_userId_isDeleted_isRead_createdAt_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_userId_isDeleted_isRead_createdAt_id_idx" ON public."Notification" USING btree (user_id, "isDeleted", "isRead", created_at DESC, id DESC);


--
-- Name: Notification_userId_isRead_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_userId_isRead_idx" ON public."Notification" USING btree (user_id, "isRead");


--
-- Name: Notification_userId_isRead_isDeleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_userId_isRead_isDeleted_idx" ON public."Notification" USING btree (user_id, "isRead", "isDeleted") WHERE (("isRead" = false) AND ("isDeleted" = false));


--
-- Name: OfflineLesson_subjectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OfflineLesson_subjectId_idx" ON public."OfflineLesson" USING btree ("subjectId");


--
-- Name: OfflineLesson_teacherId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OfflineLesson_teacherId_idx" ON public."OfflineLesson" USING btree ("teacherId");


--
-- Name: OfflineLesson_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OfflineLesson_userId_idx" ON public."OfflineLesson" USING btree ("userId");


--
-- Name: PasswordHistory_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PasswordHistory_userId_idx" ON public."PasswordHistory" USING btree ("userId");


--
-- Name: PasswordPolicy_role_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PasswordPolicy_role_key" ON public."PasswordPolicy" USING btree (role);


--
-- Name: idx_payment_paymob_order_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_payment_paymob_order_id_unique ON public."Payment" USING btree (paymob_order_id);


--
-- Name: Payment_referralRewardId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Payment_referralRewardId_key" ON public."Payment" USING btree ("referralRewardId");


--
-- Name: Payment_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Payment_status_idx" ON public."Payment" USING btree (status);


--
-- Name: idx_payment_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_plan_id ON public."Payment" USING btree (plan_id);


--
-- Name: idx_payment_plan_status_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_plan_status_created_at ON public."Payment" USING btree (plan_id, status, created_at DESC);


--
-- Name: idx_payment_external_txn_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_payment_external_txn_id_unique ON public."Payment" USING btree (external_txn_id);


--
-- Name: Payment_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Payment_userId_createdAt_idx" ON public."Payment" USING btree (user_id, created_at DESC);


--
-- Name: Payment_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Payment_userId_idx" ON public."Payment" USING btree (user_id);


--
-- Name: ProgressSnapshot_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProgressSnapshot_userId_idx" ON public."ProgressSnapshot" USING btree ("userId");


--
-- Name: QuestProgress_chainId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "QuestProgress_chainId_idx" ON public."QuestProgress" USING btree ("chainId");


--
-- Name: QuestProgress_questId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "QuestProgress_questId_idx" ON public."QuestProgress" USING btree ("questId");


--
-- Name: QuestProgress_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "QuestProgress_userId_idx" ON public."QuestProgress" USING btree ("userId");


--
-- Name: QuestProgress_userId_questId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "QuestProgress_userId_questId_key" ON public."QuestProgress" USING btree ("userId", "questId");


--
-- Name: Quest_chainId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Quest_chainId_idx" ON public."Quest" USING btree ("chainId");


--
-- Name: ReferralReward_referredId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ReferralReward_referredId_key" ON public."ReferralReward" USING btree ("referredId");


--
-- Name: Resource_subjectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Resource_subjectId_idx" ON public."Resource" USING btree ("subjectId");


--
-- Name: Schedule_subjectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Schedule_subjectId_idx" ON public."Schedule" USING btree ("subjectId");


--
-- Name: Schedule_userId_active_startTime_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Schedule_userId_active_startTime_idx" ON public."Schedule" USING btree (user_id, active, "startTime");


--
-- Name: Schedule_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Schedule_userId_idx" ON public."Schedule" USING btree (user_id);


--
-- Name: SeasonParticipation_seasonId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SeasonParticipation_seasonId_idx" ON public."SeasonParticipation" USING btree ("seasonId");


--
-- Name: SeasonParticipation_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SeasonParticipation_userId_idx" ON public."SeasonParticipation" USING btree ("userId");


--
-- Name: SeasonParticipation_userId_seasonId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SeasonParticipation_userId_seasonId_idx" ON public."SeasonParticipation" USING btree ("userId", "seasonId");


--
-- Name: SeasonParticipation_userId_seasonId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SeasonParticipation_userId_seasonId_key" ON public."SeasonParticipation" USING btree ("userId", "seasonId");


--
-- Name: SecurityLog_userId_createdAt_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SecurityLog_userId_createdAt_id_idx" ON public."SecurityLog" USING btree (user_id, created_at DESC, id DESC);


--
-- Name: SecurityLog_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SecurityLog_userId_idx" ON public."SecurityLog" USING btree (user_id);


--
-- Name: SecurityQuestion_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SecurityQuestion_userId_idx" ON public."SecurityQuestion" USING btree ("userId");


--
-- Name: SentimentAnalysis_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SentimentAnalysis_userId_idx" ON public."SentimentAnalysis" USING btree ("userId");


--
-- Name: Session_isActive_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Session_isActive_expiresAt_idx" ON public."Session" USING btree ("isActive", "expiresAt");


--
-- Name: Session_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Session_userId_idx" ON public."Session" USING btree ("userId");


--
-- Name: Session_userId_isActive_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Session_userId_isActive_expiresAt_idx" ON public."Session" USING btree ("userId", "isActive", "expiresAt" DESC);


--
-- Name: StudySession_status_startTime_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StudySession_status_startTime_idx" ON public."StudySession" USING btree (status, start_time DESC);


--
-- Name: StudySession_subjectId_isDeleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StudySession_subjectId_isDeleted_idx" ON public."StudySession" USING btree (subject_id, "isDeleted");


--
-- Name: StudySession_taskId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StudySession_taskId_idx" ON public."StudySession" USING btree ("taskId");


--
-- Name: StudySession_userId_isDeleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StudySession_userId_isDeleted_idx" ON public."StudySession" USING btree (user_id, "isDeleted");


--
-- Name: StudySession_userId_startTime_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StudySession_userId_startTime_id_idx" ON public."StudySession" USING btree (user_id, start_time DESC, id DESC);


--
-- Name: SubTopic_topicId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SubTopic_topicId_idx" ON public."SubTopic" USING btree (topic_id);


--
-- Name: SubjectCertificate_subjectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SubjectCertificate_subjectId_idx" ON public."SubjectCertificate" USING btree ("subjectId");


--
-- Name: SubjectCertificate_subjectId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SubjectCertificate_subjectId_userId_key" ON public."SubjectCertificate" USING btree ("subjectId", "userId");


--
-- Name: SubjectCertificate_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SubjectCertificate_userId_idx" ON public."SubjectCertificate" USING btree ("userId");


--
-- Name: SubjectEnrollment_active_enrollment_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SubjectEnrollment_active_enrollment_idx" ON public."SubjectEnrollment" USING btree (user_id, subject_id) WHERE ("isDeleted" = false);


--
-- Name: SubjectEnrollment_isDeleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SubjectEnrollment_isDeleted_idx" ON public."SubjectEnrollment" USING btree ("isDeleted");


--
-- Name: idx_subject_enrollment_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subject_enrollment_user_id ON public."SubjectEnrollment" USING btree (user_id);


--
-- Name: idx_subject_enrollment_subject_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subject_enrollment_subject_id ON public."SubjectEnrollment" USING btree (subject_id);


--
-- Name: SubjectReview_subjectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SubjectReview_subjectId_idx" ON public."SubjectReview" USING btree ("subjectId");


--
-- Name: SubjectReview_subjectId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SubjectReview_subjectId_userId_key" ON public."SubjectReview" USING btree ("subjectId", "userId");


--
-- Name: SubjectReview_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SubjectReview_userId_idx" ON public."SubjectReview" USING btree ("userId");


--
-- Name: Subject_categoryId_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subject_categoryId_isActive_idx" ON public."Subject" USING btree (category_id, is_active);


--
-- Name: Subject_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Subject_code_key" ON public."Subject" USING btree (code);


--
-- Name: Subject_createdAt_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subject_createdAt_id_idx" ON public."Subject" USING btree (created_at DESC, id DESC);


--
-- Name: Subject_isActive_enrolledCount_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subject_isActive_enrolledCount_idx" ON public."Subject" USING btree (is_active, enrolled_count DESC);


--
-- Name: Subject_isActive_level_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subject_isActive_level_createdAt_idx" ON public."Subject" USING btree (is_active, level, created_at DESC);


--
-- Name: Subject_isActive_price_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subject_isActive_price_id_idx" ON public."Subject" USING btree (is_active, price, id);


--
-- Name: Subject_isActive_rating_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subject_isActive_rating_idx" ON public."Subject" USING btree (is_active, rating DESC);


--
-- Name: Subject_isFeatured_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subject_isFeatured_isActive_idx" ON public."Subject" USING btree (is_featured, is_active);


--
-- Name: Subject_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Subject_name_key" ON public."Subject" USING btree (name);


--
-- Name: Subject_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Subject_slug_key" ON public."Subject" USING btree (slug);


--
-- Name: SubscriptionPlan_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SubscriptionPlan_isActive_idx" ON public."SubscriptionPlan" USING btree ("isActive");


--
-- Name: SubscriptionPlan_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SubscriptionPlan_name_key" ON public."SubscriptionPlan" USING btree (name);


--
-- Name: Subscription_planId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subscription_planId_idx" ON public."Subscription" USING btree ("planId");


--
-- Name: Subscription_status_gracePeriodEndDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subscription_status_gracePeriodEndDate_idx" ON public."Subscription" USING btree (status, "gracePeriodEndDate");


--
-- Name: Subscription_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subscription_status_idx" ON public."Subscription" USING btree (status);


--
-- Name: Subscription_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subscription_userId_idx" ON public."Subscription" USING btree ("userId");


--
-- Name: Subscription_userId_status_endDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subscription_userId_status_endDate_idx" ON public."Subscription" USING btree ("userId", status, "endDate" DESC);


--
-- Name: Task_dueAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Task_dueAt_idx" ON public."Task" USING btree (due_at);


--
-- Name: Task_isDeleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Task_isDeleted_idx" ON public."Task" USING btree ("isDeleted");


--
-- Name: Task_status_dueAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Task_status_dueAt_idx" ON public."Task" USING btree (status, due_at);


--
-- Name: Task_userId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Task_userId_status_idx" ON public."Task" USING btree (user_id, status);


--
-- Name: Task_userId_subjectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Task_userId_subjectId_idx" ON public."Task" USING btree (user_id, subject_id);


--
-- Name: TeacherEarnings_teacherId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TeacherEarnings_teacherId_key" ON public."TeacherEarnings" USING btree ("teacherId");


--
-- Name: Teacher_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Teacher_userId_idx" ON public."Teacher" USING btree ("userId");


--
-- Name: Teacher_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Teacher_userId_key" ON public."Teacher" USING btree ("userId");


--
-- Name: TestResult_examId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TestResult_examId_idx" ON public."TestResult" USING btree ("examId");


--
-- Name: TestResult_userId_examId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TestResult_userId_examId_key" ON public."TestResult" USING btree ("userId", "examId");


--
-- Name: TestResult_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TestResult_userId_idx" ON public."TestResult" USING btree ("userId");


--
-- Name: TopicProgress_subTopicId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TopicProgress_subTopicId_idx" ON public."TopicProgress" USING btree (sub_topic_id);


--
-- Name: TopicProgress_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TopicProgress_userId_idx" ON public."TopicProgress" USING btree (user_id);


--
-- Name: TopicProgress_userId_subTopicId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TopicProgress_userId_subTopicId_key" ON public."TopicProgress" USING btree (user_id, sub_topic_id);


--
-- Name: Topic_subjectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Topic_subjectId_idx" ON public."Topic" USING btree (subject_id);


--
-- Name: TwoFactorChallenge_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TwoFactorChallenge_userId_idx" ON public."TwoFactorChallenge" USING btree ("userId");


--
-- Name: UserAchievement_userId_achievementKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserAchievement_userId_achievementKey_key" ON public."UserAchievement" USING btree (user_id, "achievementKey");


--
-- Name: UserAchievement_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserAchievement_userId_idx" ON public."UserAchievement" USING btree (user_id);


--
-- Name: UserActivity_currentStreak_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserActivity_currentStreak_idx" ON public."UserActivity" USING btree ("currentStreak");


--
-- Name: UserActivity_lastActiveAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserActivity_lastActiveAt_idx" ON public."UserActivity" USING btree ("lastActiveAt");


--
-- Name: UserGrade_subjectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserGrade_subjectId_idx" ON public."UserGrade" USING btree ("subjectId");


--
-- Name: UserGrade_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserGrade_userId_idx" ON public."UserGrade" USING btree ("userId");


--
-- Name: UserGrade_userId_subjectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserGrade_userId_subjectId_idx" ON public."UserGrade" USING btree ("userId", "subjectId");


--
-- Name: UserInteraction_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserInteraction_userId_idx" ON public."UserInteraction" USING btree ("userId");


--
-- Name: UserReward_rewardId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserReward_rewardId_idx" ON public."UserReward" USING btree ("rewardId");


--
-- Name: UserReward_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserReward_userId_idx" ON public."UserReward" USING btree ("userId");


--
-- Name: UserReward_userId_rewardId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserReward_userId_rewardId_key" ON public."UserReward" USING btree ("userId", "rewardId");


--
-- Name: UserXP_level_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserXP_level_idx" ON public."UserXP" USING btree (level);


--
-- Name: UserXP_totalXP_level_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserXP_totalXP_level_idx" ON public."UserXP" USING btree ("totalXP" DESC, level);




--
-- Name: idx_user_email_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_user_email_unique ON public."User" USING btree (email);


--
-- Name: idx_user_github_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_user_github_id_unique ON public."User" USING btree ("githubId");


--
-- Name: idx_user_google_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_user_google_id_unique ON public."User" USING btree ("googleId");


--
-- Name: User_isDeleted_status_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_isDeleted_status_role_idx" ON public."User" USING btree ("isDeleted", status, role);


--
-- Name: idx_user_referral_code_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_user_referral_code_unique ON public."User" USING btree ("referralCode");


--
-- Name: WalletTransaction_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WalletTransaction_createdAt_idx" ON public."WalletTransaction" USING btree (created_at DESC);


--
-- Name: WalletTransaction_paymentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "WalletTransaction_paymentId_key" ON public."WalletTransaction" USING btree ("paymentId");


--
-- Name: WalletTransaction_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WalletTransaction_type_idx" ON public."WalletTransaction" USING btree (type);


--
-- Name: WalletTransaction_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WalletTransaction_userId_idx" ON public."WalletTransaction" USING btree (user_id);


--
-- Name: WalletTransaction_walletId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WalletTransaction_walletId_idx" ON public."WalletTransaction" USING btree ("walletId");


--
-- Name: _GroupMembers_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_GroupMembers_B_index" ON public."_GroupMembers" USING btree ("B");


--
-- Name: _SubjectToTeacher_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_SubjectToTeacher_B_index" ON public."_SubjectToTeacher" USING btree ("B");


--
-- Name: idx_examresult_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_examresult_deleted_at ON ONLY public."ExamResult" USING btree (deleted_at);


--
-- Name: examresult_p2026_02_deleted_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX examresult_p2026_02_deleted_at_idx ON public.examresult_p2026_02 USING btree (deleted_at);


--
-- Name: idx_examresult_user_taken; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_examresult_user_taken ON ONLY public."ExamResult" USING btree (user_id, taken_at DESC);


--
-- Name: examresult_p2026_02_user_id_taken_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX examresult_p2026_02_user_id_taken_at_idx ON public.examresult_p2026_02 USING btree (user_id, taken_at DESC);


--
-- Name: examresult_p2026_03_deleted_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX examresult_p2026_03_deleted_at_idx ON public.examresult_p2026_03 USING btree (deleted_at);


--
-- Name: examresult_p2026_03_user_id_taken_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX examresult_p2026_03_user_id_taken_at_idx ON public.examresult_p2026_03 USING btree (user_id, taken_at DESC);


--
-- Name: examresult_p2026_04_deleted_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX examresult_p2026_04_deleted_at_idx ON public.examresult_p2026_04 USING btree (deleted_at);


--
-- Name: examresult_p2026_04_user_id_taken_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX examresult_p2026_04_user_id_taken_at_idx ON public.examresult_p2026_04 USING btree (user_id, taken_at DESC);


--
-- Name: examresult_p2026_05_deleted_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX examresult_p2026_05_deleted_at_idx ON public.examresult_p2026_05 USING btree (deleted_at);


--
-- Name: examresult_p2026_05_user_id_taken_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX examresult_p2026_05_user_id_taken_at_idx ON public.examresult_p2026_05 USING btree (user_id, taken_at DESC);


--
-- Name: examresult_p2026_06_deleted_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX examresult_p2026_06_deleted_at_idx ON public.examresult_p2026_06 USING btree (deleted_at);


--
-- Name: examresult_p2026_06_user_id_taken_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX examresult_p2026_06_user_id_taken_at_idx ON public.examresult_p2026_06 USING btree (user_id, taken_at DESC);


--
-- Name: examresult_p2026_07_deleted_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX examresult_p2026_07_deleted_at_idx ON public.examresult_p2026_07 USING btree (deleted_at);


--
-- Name: examresult_p2026_07_user_id_taken_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX examresult_p2026_07_user_id_taken_at_idx ON public.examresult_p2026_07 USING btree (user_id, taken_at DESC);


--
-- Name: examresult_p2026_08_deleted_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX examresult_p2026_08_deleted_at_idx ON public.examresult_p2026_08 USING btree (deleted_at);


--
-- Name: examresult_p2026_08_user_id_taken_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX examresult_p2026_08_user_id_taken_at_idx ON public.examresult_p2026_08 USING btree (user_id, taken_at DESC);

CREATE INDEX examresult_p2026_09_deleted_at_idx ON public.examresult_p2026_09 USING btree (deleted_at);
CREATE INDEX examresult_p2026_09_user_id_taken_at_idx ON public.examresult_p2026_09 USING btree (user_id, taken_at DESC);

CREATE INDEX examresult_p2026_10_deleted_at_idx ON public.examresult_p2026_10 USING btree (deleted_at);
CREATE INDEX examresult_p2026_10_user_id_taken_at_idx ON public.examresult_p2026_10 USING btree (user_id, taken_at DESC);

CREATE INDEX examresult_p2026_11_deleted_at_idx ON public.examresult_p2026_11 USING btree (deleted_at);
CREATE INDEX examresult_p2026_11_user_id_taken_at_idx ON public.examresult_p2026_11 USING btree (user_id, taken_at DESC);

CREATE INDEX examresult_p2026_12_deleted_at_idx ON public.examresult_p2026_12 USING btree (deleted_at);
CREATE INDEX examresult_p2026_12_user_id_taken_at_idx ON public.examresult_p2026_12 USING btree (user_id, taken_at DESC);


--
-- Name: examresult_pdefault_deleted_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX examresult_pdefault_deleted_at_idx ON public.examresult_pdefault USING btree (deleted_at);


--
-- Name: examresult_pdefault_user_id_taken_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX examresult_pdefault_user_id_taken_at_idx ON public.examresult_pdefault USING btree (user_id, taken_at DESC);


--
-- Name: idx_Achievement_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Achievement_deleted_at" ON public."Achievement" USING btree (deleted_at);


--
-- Name: idx_Achievement_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "idx_Achievement_key" ON public."Achievement" USING btree (key);


--
-- Name: idx_BlogPost_author_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_BlogPost_author_id" ON public."BlogPost" USING btree (author_id);


--
-- Name: idx_BlogPost_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_BlogPost_category_id" ON public."BlogPost" USING btree (category_id);


--
-- Name: idx_BlogPost_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_BlogPost_deleted_at" ON public."BlogPost" USING btree (deleted_at);


--
-- Name: idx_BlogPost_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "idx_BlogPost_slug" ON public."BlogPost" USING btree (slug);


--
-- Name: idx_Category_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Category_deleted_at" ON public."Category" USING btree (deleted_at);


--
-- Name: idx_Category_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "idx_Category_slug" ON public."Category" USING btree (slug);


--
-- Name: idx_Challenge_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Challenge_deleted_at" ON public."Challenge" USING btree (deleted_at);


--
-- Name: idx_Challenge_subject_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Challenge_subject_id" ON public."Challenge" USING btree (subject_id);


--
-- Name: idx_Coupon_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "idx_Coupon_code" ON public."Coupon" USING btree (code);


--
-- Name: idx_CourseReview_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_CourseReview_deleted_at" ON public."CourseReview" USING btree (deleted_at);


--
-- Name: idx_CourseReview_subject_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_CourseReview_subject_id" ON public."CourseReview" USING btree ("subjectId");


--
-- Name: idx_CourseReview_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_CourseReview_user_id" ON public."CourseReview" USING btree ("userId");


--
-- Name: idx_Exam_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Exam_deleted_at" ON public."Exam" USING btree (deleted_at);


--
-- Name: idx_Exam_subject_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Exam_subject_id" ON public."Exam" USING btree (subject_id);


--
-- Name: idx_Exam_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Exam_type" ON public."Exam" USING btree (type);


--
-- Name: idx_ForumCategory_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_ForumCategory_deleted_at" ON public."ForumCategory" USING btree (deleted_at);


--
-- Name: idx_ForumTopic_author_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_ForumTopic_author_id" ON public."ForumTopic" USING btree (author_id);


--
-- Name: idx_ForumTopic_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_ForumTopic_category_id" ON public."ForumTopic" USING btree (category_id);


--
-- Name: idx_ForumTopic_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_ForumTopic_deleted_at" ON public."ForumTopic" USING btree (deleted_at);


--
-- Name: idx_Invoice_invoice_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "idx_Invoice_invoice_number" ON public."Invoice" USING btree (invoice_number);


--
-- Name: idx_Invoice_payment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "idx_Invoice_payment_id" ON public."Invoice" USING btree (payment_id);


--
-- Name: idx_Invoice_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Invoice_user_id" ON public."Invoice" USING btree (user_id);


--
-- Name: idx_LessonAttachment_sub_topic_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_LessonAttachment_sub_topic_id" ON public."LessonAttachment" USING btree ("subTopicId");


--
-- Name: idx_LiveEvent_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_LiveEvent_deleted_at" ON public."LiveEvent" USING btree (deleted_at);


--
-- Name: idx_LiveEvent_subject_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_LiveEvent_subject_id" ON public."LiveEvent" USING btree (subject_id);


--
-- Name: idx_Notification_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Notification_is_read" ON public."Notification" USING btree ("isRead");


--
-- Name: idx_Notification_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Notification_type" ON public."Notification" USING btree (type);


--
-- Name: idx_Payment_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Payment_created_at" ON public."Payment" USING btree (created_at);


--
-- Name: idx_Payment_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Payment_deleted_at" ON public."Payment" USING btree (deleted_at);


--
-- Name: idx_Payment_external_txn_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Payment_external_txn_id" ON public."Payment" USING btree (external_txn_id);


--
-- Name: idx_Payment_paymob_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Payment_paymob_order_id" ON public."Payment" USING btree (paymob_order_id);


--
-- Name: idx_Payment_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Payment_plan_id" ON public."Payment" USING btree (plan_id);


--
-- Name: idx_Payment_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "idx_Payment_reference" ON public."Payment" USING btree (reference);


--
-- Name: idx_Payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Payment_status" ON public."Payment" USING btree (status);


--
-- Name: idx_Payment_subject_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Payment_subject_id" ON public."Payment" USING btree (subject_id);


--
-- Name: idx_Payment_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Payment_user_id" ON public."Payment" USING btree (user_id);


--
-- Name: idx_Question_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Question_deleted_at" ON public."Question" USING btree (deleted_at);


--
-- Name: idx_Question_exam_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Question_exam_id" ON public."Question" USING btree (exam_id);


--
-- Name: idx_Reminder_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Reminder_user_id" ON public."Reminder" USING btree (user_id);


--
-- Name: idx_Reward_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Reward_deleted_at" ON public."Reward" USING btree (deleted_at);


--
-- Name: idx_Schedule_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Schedule_user_id" ON public."Schedule" USING btree (user_id);


--
-- Name: idx_Season_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Season_deleted_at" ON public."Season" USING btree (deleted_at);


--
-- Name: idx_SecurityLog_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_SecurityLog_event_type" ON public."SecurityLog" USING btree (event_type);


--
-- Name: idx_Session_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Session_deleted_at" ON public."Session" USING btree ("deletedAt");


--
-- Name: idx_Session_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Session_expires_at" ON public."Session" USING btree ("expiresAt");


--
-- Name: idx_Session_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Session_is_active" ON public."Session" USING btree ("isActive");


--
-- Name: idx_Session_refresh_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "idx_Session_refresh_token" ON public."Session" USING btree ("refreshToken");


--
-- Name: idx_Session_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Session_user_id" ON public."Session" USING btree ("userId");


--
-- Name: idx_StudySession_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_StudySession_deleted_at" ON public."StudySession" USING btree (deleted_at);


--
-- Name: idx_StudySession_subject_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_StudySession_subject_id" ON public."StudySession" USING btree (subject_id);


--
-- Name: idx_SubTopic_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_SubTopic_deleted_at" ON public."SubTopic" USING btree (deleted_at);


--
-- Name: idx_SubTopic_exam_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_SubTopic_exam_id" ON public."SubTopic" USING btree (exam_id);


--
-- Name: idx_SubTopic_is_free; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_SubTopic_is_free" ON public."SubTopic" USING btree (is_free);


--
-- Name: idx_SubTopic_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_SubTopic_order" ON public."SubTopic" USING btree ("order");


--
-- Name: idx_SubTopic_title; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_SubTopic_title" ON public."SubTopic" USING btree (title);


--
-- Name: idx_SubTopic_topic_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_SubTopic_topic_id" ON public."SubTopic" USING btree (topic_id);


--
-- Name: idx_SubTopic_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_SubTopic_type" ON public."SubTopic" USING btree (type);




--
-- Name: idx_SubjectEnrollment_enrolled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_SubjectEnrollment_enrolled_at" ON public."SubjectEnrollment" USING btree (enrolled_at);


--
-- Name: idx_SubjectEnrollment_progress; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_SubjectEnrollment_progress" ON public."SubjectEnrollment" USING btree (progress);


--
-- Name: idx_Subject_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Subject_category_id" ON public."Subject" USING btree (category_id);


--
-- Name: idx_Subject_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "idx_Subject_code" ON public."Subject" USING btree (code, code);


--
-- Name: idx_Subject_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Subject_created_at" ON public."Subject" USING btree (created_at);


--
-- Name: idx_Subject_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Subject_deleted_at" ON public."Subject" USING btree (deleted_at);


--
-- Name: idx_Subject_instructor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Subject_instructor_id" ON public."Subject" USING btree (instructor_id);


--
-- Name: idx_Subject_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Subject_is_active" ON public."Subject" USING btree (is_active);


--
-- Name: idx_Subject_is_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Subject_is_featured" ON public."Subject" USING btree (is_featured);


--
-- Name: idx_Subject_is_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Subject_is_published" ON public."Subject" USING btree (is_published);


--
-- Name: idx_Subject_language; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Subject_language" ON public."Subject" USING btree (language);


--
-- Name: idx_Subject_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Subject_level" ON public."Subject" USING btree (level);


--
-- Name: idx_Subject_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "idx_Subject_name" ON public."Subject" USING btree (name, name);


--
-- Name: idx_Subject_name_ar; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Subject_name_ar" ON public."Subject" USING btree (name_ar);


--
-- Name: idx_Subject_price; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Subject_price" ON public."Subject" USING btree (price);


--
-- Name: idx_Subject_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "idx_Subject_slug" ON public."Subject" USING btree (slug);


--
-- Name: idx_Task_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Task_created_at" ON public."Task" USING btree (created_at);


--
-- Name: idx_Task_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Task_deleted_at" ON public."Task" USING btree (deleted_at);


--
-- Name: idx_Task_due_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Task_due_at" ON public."Task" USING btree (due_at);


--
-- Name: idx_Task_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Task_priority" ON public."Task" USING btree (priority);


--
-- Name: idx_Task_subject_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Task_subject_id" ON public."Task" USING btree (subject_id);


--
-- Name: idx_TopicProgress_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_TopicProgress_completed" ON public."TopicProgress" USING btree (completed);


--
-- Name: idx_TopicProgress_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_TopicProgress_created_at" ON public."TopicProgress" USING btree (created_at);


--
-- Name: idx_TopicProgress_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_TopicProgress_deleted_at" ON public."TopicProgress" USING btree (deleted_at);


--
-- Name: idx_TopicProgress_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_TopicProgress_status" ON public."TopicProgress" USING btree (status);


--
-- Name: idx_Topic_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Topic_deleted_at" ON public."Topic" USING btree (deleted_at);


--
-- Name: idx_Topic_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Topic_order" ON public."Topic" USING btree ("order");


--
-- Name: idx_Topic_subject_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Topic_subject_id" ON public."Topic" USING btree (subject_id);


--
-- Name: idx_Topic_title; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_Topic_title" ON public."Topic" USING btree (title);


--
-- Name: idx_UserAchievement_achievement_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_UserAchievement_achievement_id" ON public."UserAchievement" USING btree (achievement_id);


--
-- Name: idx_UserAchievement_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_UserAchievement_deleted_at" ON public."UserAchievement" USING btree (deleted_at);


--
-- Name: idx_UserAchievement_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_UserAchievement_user_id" ON public."UserAchievement" USING btree (user_id);


--
-- Name: idx_UserChallenge_challenge_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_UserChallenge_challenge_id" ON public."UserChallenge" USING btree (challenge_id);


--
-- Name: idx_UserChallenge_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_UserChallenge_deleted_at" ON public."UserChallenge" USING btree (deleted_at);


--
-- Name: idx_UserChallenge_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_UserChallenge_user_id" ON public."UserChallenge" USING btree (user_id);


--
-- Name: idx_UserSettings_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_UserSettings_deleted_at" ON public."UserSettings" USING btree ("deletedAt");


--
-- Name: idx_UserSettings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "idx_UserSettings_user_id" ON public."UserSettings" USING btree (user_id);


--
-- Name: idx_User_active_subscription_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_User_active_subscription_id" ON public."User" USING btree (active_subscription_id);


--
-- Name: idx_User_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_User_country" ON public."User" USING btree (country);






--
-- Name: idx_User_email_verified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_User_email_verified" ON public."User" USING btree (email_verified);


--
-- Name: idx_User_grade_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_User_grade_level" ON public."User" USING btree ("gradeLevel");




--
-- Name: idx_User_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_User_level" ON public."User" USING btree (level);


--
-- Name: idx_User_magic_link_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_User_magic_link_token" ON public."User" USING btree (magic_link_token);


--
-- Name: idx_User_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_User_name" ON public."User" USING btree (name);


--
-- Name: idx_User_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_User_phone" ON public."User" USING btree (phone);


--
-- Name: idx_User_reset_password_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_User_reset_password_token" ON public."User" USING btree (reset_password_token);


--
-- Name: idx_User_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_User_role" ON public."User" USING btree (role);


--
-- Name: idx_User_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_User_status" ON public."User" USING btree (status);


--
-- Name: idx_User_subscription_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_User_subscription_expires_at" ON public."User" USING btree (subscription_expires_at);




--
-- Name: idx_User_username; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "idx_User_username" ON public."User" USING btree (username);


--
-- Name: idx_User_verification_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_User_verification_token" ON public."User" USING btree (verification_token);


--
-- Name: idx_achievement_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_achievement_deleted_at ON public."Achievement" USING btree (deleted_at);


--
-- Name: idx_attachment_subtopic_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attachment_subtopic_created ON public."LessonAttachment" USING btree ("subTopicId", "createdAt");


--
-- Name: idx_blogpost_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blogpost_deleted_at ON public."BlogPost" USING btree (deleted_at);


--
-- Name: idx_book_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_book_deleted_at ON public."Book" USING btree (deleted_at);


--
-- Name: idx_book_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_book_subject ON public."Book" USING btree ("subjectId");


--
-- Name: idx_category_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_category_created_at ON public."Category" USING btree (created_at);


--
-- Name: idx_category_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_category_deleted_at ON public."Category" USING btree (deleted_at);


--
-- Name: idx_category_slug_type; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_category_slug_type ON public."Category" USING btree (slug, type) WHERE (deleted_at IS NULL);


--
-- Name: idx_category_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_category_updated_at ON public."Category" USING btree (updated_at);


--
-- Name: idx_challenge_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_challenge_deleted_at ON public."Challenge" USING btree (deleted_at);


--
-- Name: idx_contest_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contest_deleted_at ON public."Contest" USING btree (deleted_at);


--
-- Name: idx_coupon_code_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coupon_code_active ON public."Coupon" USING btree (code, is_active);


--
-- Name: idx_coupon_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coupon_deleted_at ON public."Coupon" USING btree (deleted_at);


--
-- Name: idx_course_review_user_subject_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_course_review_user_subject_unique ON public."CourseReview" USING btree ("userId", "subjectId");


--
-- Name: idx_coursereview_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coursereview_deleted_at ON public."CourseReview" USING btree (deleted_at);


--
-- Name: idx_deleted_archive_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deleted_archive_table ON public."DeletedRecordArchive" USING btree (table_name, "createdAt" DESC);


--
-- Name: idx_deleted_archive_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deleted_archive_user ON public."DeletedRecordArchive" USING btree (user_id, "createdAt" DESC);


--
-- Name: idx_enrollment_subject_enrolled_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enrollment_subject_enrolled_desc ON public."SubjectEnrollment" USING btree (subject_id, enrolled_at DESC);


--
-- Name: idx_enrollment_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enrollment_user_created ON public."SubjectEnrollment" USING btree (user_id, created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_enrollment_user_enrolled_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enrollment_user_enrolled_desc ON public."SubjectEnrollment" USING btree (user_id, enrolled_at DESC);


--
-- Name: idx_event_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_deleted_at ON public."Event" USING btree (deleted_at);


--
-- Name: idx_exam_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_deleted_at ON public."Exam" USING btree (deleted_at);


--
-- Name: idx_exam_subject_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_subject_created ON public."Exam" USING btree (subject_id, created_at DESC);


--
-- Name: idx_exam_title_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_title_trgm ON public."Exam" USING gin (title public.gin_trgm_ops);


--
-- Name: idx_invoice_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_deleted_at ON public."Invoice" USING btree (deleted_at);


--
-- Name: idx_invoice_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_user_created ON public."Invoice" USING btree (user_id, created_at DESC);


--
-- Name: idx_lessonattachment_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lessonattachment_deleted_at ON public."LessonAttachment" USING btree (deleted_at);


--
-- Name: idx_notification_created_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_created_desc ON public."Notification" USING btree (created_at DESC);


--
-- Name: idx_notification_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_deleted_at ON public."Notification" USING btree (deleted_at);


--
-- Name: idx_notification_message_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_message_trgm ON public."Notification" USING gin (message public.gin_trgm_ops);


--
-- Name: idx_notification_title_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_title_trgm ON public."Notification" USING gin (title public.gin_trgm_ops);


--
-- Name: idx_notification_user_read_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_user_read_created ON public."Notification" USING btree (user_id, "isRead", created_at DESC);


--
-- Name: idx_notifications_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_created ON public."Notification" USING btree (user_id, created_at);


--
-- Name: idx_payment_active_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_active_user_created ON public."Payment" USING btree (user_id, created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_payment_completed_subject_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_completed_subject_user ON public."Payment" USING btree (user_id, subject_id, status) WHERE (status = 'completed'::text);


--
-- Name: idx_payment_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_deleted_at ON public."Payment" USING btree (deleted_at);


--
-- Name: idx_payment_failed_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_failed_user ON public."Payment" USING btree (user_id, created_at) WHERE (status = 'failed'::text);


--
-- Name: idx_payment_pending_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_pending_user ON public."Payment" USING btree (user_id, created_at) WHERE (status = :'PENDING_LOWER'::text);


--
-- Name: idx_payment_reference_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_reference_trgm ON public."Payment" USING gin (reference public.gin_trgm_ops);


--
-- Name: idx_payment_status_created_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_status_created_desc ON public."Payment" USING btree (status, created_at DESC);


--
-- Name: idx_payment_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_subject ON public."Payment" USING btree (subject_id);


--
-- Name: idx_payment_subject_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_subject_status_created ON public."Payment" USING btree (subject_id, status, created_at DESC);


--
-- Name: idx_payment_user_created_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_user_created_desc ON public."Payment" USING btree (user_id, created_at DESC);


--
-- Name: idx_payment_user_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_user_status_created ON public."Payment" USING btree (user_id, status, created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_payment_user_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_user_subject ON public."Payment" USING btree (user_id, subject_id);


--
-- Name: idx_perf_notifications_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_perf_notifications_user_created ON public."Notification" USING btree (user_id, created_at DESC);


--
-- Name: idx_question_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_deleted_at ON public."Question" USING btree (deleted_at);


--
-- Name: idx_question_exam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_exam ON public."Question" USING btree (exam_id);


--
-- Name: idx_questions_exam_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_exam_id ON public.questions USING btree (exam_id);


--
-- Name: idx_reminder_active_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminder_active_time ON public."Reminder" USING btree (is_active, remind_at);


--
-- Name: idx_reminder_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminder_deleted_at ON public."Reminder" USING btree ("deletedAt");


--
-- Name: idx_reminder_user_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminder_user_time ON public."Reminder" USING btree (user_id, remind_at);


--
-- Name: idx_resource_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_created ON public."Resource" USING btree (created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_resource_subject_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_subject_created ON public."Resource" USING btree (subject_id, created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_resource_type_free; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_type_free ON public."Resource" USING btree (type, free) WHERE (deleted_at IS NULL);


--
-- Name: idx_reward_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reward_deleted_at ON public."Reward" USING btree ("deletedAt");


--
-- Name: idx_schedule_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_deleted_at ON public."Schedule" USING btree ("deletedAt");


--
-- Name: idx_schedule_user_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_schedule_user_unique ON public."Schedule" USING btree (user_id);


--
-- Name: idx_schedule_user_updated_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_user_updated_desc ON public."Schedule" USING btree (user_id, updated_at DESC);


--
-- Name: idx_season_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_season_deleted_at ON public."Season" USING btree ("deletedAt");


--
-- Name: idx_security_log_created_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_log_created_desc ON public."SecurityLog" USING btree (created_at DESC);


--
-- Name: idx_security_log_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_log_deleted_at ON public."SecurityLog" USING btree (deleted_at);


--
-- Name: idx_security_log_event_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_log_event_created ON public."SecurityLog" USING btree (event_type, created_at DESC);


--
-- Name: idx_security_logs_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_logs_user_created ON public."SecurityLog" USING btree (user_id, created_at);


--
-- Name: idx_securitylog_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_securitylog_deleted_at ON public."SecurityLog" USING btree (deleted_at);


--
-- Name: idx_session_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_deleted_at ON public."Session" USING btree (deleted_at);


--
-- Name: idx_session_refresh_token_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_refresh_token_active ON public."Session" USING btree ("refreshToken") WHERE ("isActive" = true);


--
-- Name: idx_session_user_active_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_user_active_expires ON public."Session" USING btree ("userId", "isActive", "expiresAt");


--
-- Name: idx_session_user_active_last_accessed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_user_active_last_accessed ON public."Session" USING btree ("userId", "isActive", "lastAccessed");


--
-- Name: idx_study_session_created_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_study_session_created_desc ON public."StudySession" USING btree (created_at DESC);


--
-- Name: idx_study_session_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_study_session_subject ON public."StudySession" USING btree (subject_id);


--
-- Name: idx_study_session_taken_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_study_session_taken_activity ON public."StudySession" USING btree (updated_at, start_time, end_time);


--
-- Name: idx_study_session_user_created_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_study_session_user_created_desc ON public."StudySession" USING btree (user_id, created_at DESC);


--
-- Name: idx_study_session_user_start_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_study_session_user_start_desc ON public."StudySession" USING btree (user_id, start_time DESC);


--
-- Name: idx_study_sessions_user_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_study_sessions_user_start ON public."StudySession" USING btree (user_id, start_time);


--
-- Name: idx_studysession_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_studysession_deleted_at ON public."StudySession" USING btree (deleted_at);


--
-- Name: idx_subject_active_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subject_active_published ON public."Subject" USING btree (is_published, is_active, level, category_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_subject_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subject_deleted_at ON public."Subject" USING btree (deleted_at);


--
-- Name: idx_subject_enrolled_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subject_enrolled_desc ON public."Subject" USING btree (enrolled_count DESC);


--
-- Name: idx_subject_featured_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subject_featured_public ON public."Subject" USING btree (is_featured, is_published, is_active);


--
-- Name: idx_subject_instructor_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subject_instructor_created ON public."Subject" USING btree (instructor_id, created_at DESC) WHERE ((instructor_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: idx_subject_name_ar_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subject_name_ar_trgm ON public."Subject" USING gin (name_ar public.gin_trgm_ops);


--
-- Name: idx_subject_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subject_name_trgm ON public."Subject" USING gin (name public.gin_trgm_ops);


--
-- Name: idx_subject_public_catalog; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subject_public_catalog ON public."Subject" USING btree (is_published, is_active, level, category_id, created_at DESC);


--
-- Name: idx_subject_public_catalog_snake; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subject_public_catalog_snake ON public."Subject" USING btree (is_published, is_active, level, category_id, created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_subjectenrollment_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subjectenrollment_deleted_at ON public."SubjectEnrollment" USING btree (deleted_at);


--
-- Name: idx_subscriptionplan_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptionplan_deleted_at ON public."SubscriptionPlan" USING btree (deleted_at);


--
-- Name: idx_subtopic_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subtopic_deleted_at ON public."SubTopic" USING btree (deleted_at);


--
-- Name: idx_subtopic_topic_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subtopic_topic_order ON public."SubTopic" USING btree (topic_id, "order");


--
-- Name: idx_subtopic_topic_order_snake; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subtopic_topic_order_snake ON public."SubTopic" USING btree (topic_id, "order") WHERE (deleted_at IS NULL);


--
-- Name: idx_system_setting_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_setting_deleted_at ON public."SystemSetting" USING btree (deleted_at);


--
-- Name: idx_system_setting_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_setting_key ON public."SystemSetting" USING btree (key);


--
-- Name: idx_systemsetting_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_systemsetting_deleted_at ON public."SystemSetting" USING btree (deleted_at);


--
-- Name: idx_task_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_deleted_at ON public."Task" USING btree (deleted_at);


--
-- Name: idx_task_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_status_created ON public."Task" USING btree (status, created_at DESC);


--
-- Name: idx_task_user_created_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_user_created_desc ON public."Task" USING btree (user_id, created_at DESC);


--
-- Name: idx_task_user_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_user_due ON public."Task" USING btree (user_id, due_at);


--
-- Name: idx_task_user_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_user_status_created ON public."Task" USING btree (user_id, status, created_at DESC);


--
-- Name: idx_tasks_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_user_status ON public."Task" USING btree (user_id, status);


--
-- Name: idx_topic_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topic_deleted_at ON public."Topic" USING btree (deleted_at);


--
-- Name: idx_topic_progress_user_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topic_progress_user_completed ON public."TopicProgress" USING btree (user_id, completed);


--
-- Name: idx_topic_progress_user_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topic_progress_user_updated ON public."TopicProgress" USING btree (user_id, updated_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_topic_subject_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topic_subject_order ON public."Topic" USING btree (subject_id, "order");


--
-- Name: idx_topic_subject_order_snake; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topic_subject_order_snake ON public."Topic" USING btree (subject_id, "order") WHERE (deleted_at IS NULL);


--
-- Name: idx_topicprogress_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topicprogress_deleted_at ON public."TopicProgress" USING btree (deleted_at);


--
-- Name: idx_user_active_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_active_email ON public."User" USING btree (email) WHERE (deleted_at IS NULL);


--
-- Name: idx_user_created_at_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_created_at_desc ON public."User" USING btree (created_at DESC);


--
-- Name: idx_user_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_deleted_at ON public."User" USING btree (deleted_at);




--
-- Name: idx_user_last_login; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_last_login ON public."User" USING btree (last_login DESC) WHERE (last_login IS NOT NULL);


--
-- Name: idx_user_lesson; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_user_lesson ON public."TopicProgress" USING btree (user_id, sub_topic_id);


--
-- Name: idx_user_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_level ON public."User" USING btree (level);


--
-- Name: idx_user_magic_token_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_magic_token_active ON public."User" USING btree (magic_link_token, magic_link_expires) WHERE (magic_link_token IS NOT NULL);




--
-- Name: idx_user_password_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_password_hash ON public."User" USING btree (password_hash);


--
-- Name: idx_user_reset_token_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_reset_token_active ON public."User" USING btree (reset_password_token, reset_password_expires) WHERE (reset_password_token IS NOT NULL);


--
-- Name: idx_user_role_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_role_created_at ON public."User" USING btree (role, created_at DESC);


--
-- Name: idx_user_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_user_settings_user_id ON public."UserSettings" USING btree (user_id);


--
-- Name: idx_user_status_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_status_updated_at ON public."User" USING btree (status, updated_at DESC);


--
-- Name: idx_user_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_user_subject ON public."SubjectEnrollment" USING btree (user_id, subject_id);


--
-- Name: idx_user_subject_review; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_user_subject_review ON public."CourseReview" USING btree (subject_id, user_id);


--
-- Name: idx_user_total_xp_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_total_xp_desc ON public."User" USING btree (total_xp DESC) WHERE (deleted_at IS NULL);




--
-- Name: idx_user_verification_token_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_verification_token_active ON public."User" USING btree (verification_token, verification_expires) WHERE (verification_token IS NOT NULL);


--
-- Name: idx_userachievement_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_userachievement_deleted_at ON public."UserAchievement" USING btree (deleted_at);


--
-- Name: idx_usersettings_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usersettings_deleted_at ON public."UserSettings" USING btree (deleted_at);


--
-- Name: idx_wallettransaction_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallettransaction_deleted_at ON public."WalletTransaction" USING btree (deleted_at);


--
-- Name: subject_description_trgm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subject_description_trgm_idx ON public."Subject" USING gin (description public.gin_trgm_ops);


--
-- Name: subject_name_ar_trgm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subject_name_ar_trgm_idx ON public."Subject" USING gin (name_ar public.gin_trgm_ops);


--
-- Name: subject_name_trgm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subject_name_trgm_idx ON public."Subject" USING gin (name public.gin_trgm_ops);


--
-- Name: subject_slug_trgm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subject_slug_trgm_idx ON public."Subject" USING gin (slug public.gin_trgm_ops);


--
-- Name: idx_user_email_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_email_trgm ON public."User" USING gin (email public.gin_trgm_ops);


--
-- Name: idx_user_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_name_trgm ON public."User" USING gin (name public.gin_trgm_ops);


--
-- Name: idx_user_username_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_username_trgm ON public."User" USING gin (username public.gin_trgm_ops);


--
-- Name: examresult_p2026_02_deleted_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_examresult_deleted_at ATTACH PARTITION public.examresult_p2026_02_deleted_at_idx;


--
-- Name: examresult_p2026_02_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."ExamResult_pkey" ATTACH PARTITION public.examresult_p2026_02_pkey;


--
-- Name: examresult_p2026_02_user_id_taken_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_examresult_user_taken ATTACH PARTITION public.examresult_p2026_02_user_id_taken_at_idx;


--
-- Name: examresult_p2026_03_deleted_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_examresult_deleted_at ATTACH PARTITION public.examresult_p2026_03_deleted_at_idx;


--
-- Name: examresult_p2026_03_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."ExamResult_pkey" ATTACH PARTITION public.examresult_p2026_03_pkey;


--
-- Name: examresult_p2026_03_user_id_taken_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_examresult_user_taken ATTACH PARTITION public.examresult_p2026_03_user_id_taken_at_idx;


--
-- Name: examresult_p2026_04_deleted_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_examresult_deleted_at ATTACH PARTITION public.examresult_p2026_04_deleted_at_idx;


--
-- Name: examresult_p2026_04_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."ExamResult_pkey" ATTACH PARTITION public.examresult_p2026_04_pkey;


--
-- Name: examresult_p2026_04_user_id_taken_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_examresult_user_taken ATTACH PARTITION public.examresult_p2026_04_user_id_taken_at_idx;


--
-- Name: examresult_p2026_05_deleted_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_examresult_deleted_at ATTACH PARTITION public.examresult_p2026_05_deleted_at_idx;


--
-- Name: examresult_p2026_05_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."ExamResult_pkey" ATTACH PARTITION public.examresult_p2026_05_pkey;


--
-- Name: examresult_p2026_05_user_id_taken_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_examresult_user_taken ATTACH PARTITION public.examresult_p2026_05_user_id_taken_at_idx;


--
-- Name: examresult_p2026_06_deleted_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_examresult_deleted_at ATTACH PARTITION public.examresult_p2026_06_deleted_at_idx;


--
-- Name: examresult_p2026_06_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."ExamResult_pkey" ATTACH PARTITION public.examresult_p2026_06_pkey;


--
-- Name: examresult_p2026_06_user_id_taken_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_examresult_user_taken ATTACH PARTITION public.examresult_p2026_06_user_id_taken_at_idx;


--
-- Name: examresult_p2026_07_deleted_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_examresult_deleted_at ATTACH PARTITION public.examresult_p2026_07_deleted_at_idx;


--
-- Name: examresult_p2026_07_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."ExamResult_pkey" ATTACH PARTITION public.examresult_p2026_07_pkey;


--
-- Name: examresult_p2026_07_user_id_taken_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_examresult_user_taken ATTACH PARTITION public.examresult_p2026_07_user_id_taken_at_idx;


--
-- Name: examresult_p2026_08_deleted_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_examresult_deleted_at ATTACH PARTITION public.examresult_p2026_08_deleted_at_idx;


--
-- Name: examresult_p2026_08_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."ExamResult_pkey" ATTACH PARTITION public.examresult_p2026_08_pkey;


--
-- Name: examresult_p2026_08_user_id_taken_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_examresult_user_taken ATTACH PARTITION public.examresult_p2026_08_user_id_taken_at_idx;

ALTER INDEX public.idx_examresult_deleted_at ATTACH PARTITION public.examresult_p2026_09_deleted_at_idx;
ALTER INDEX public."ExamResult_pkey" ATTACH PARTITION public.examresult_p2026_09_pkey;
ALTER INDEX public.idx_examresult_user_taken ATTACH PARTITION public.examresult_p2026_09_user_id_taken_at_idx;

ALTER INDEX public.idx_examresult_deleted_at ATTACH PARTITION public.examresult_p2026_10_deleted_at_idx;
ALTER INDEX public."ExamResult_pkey" ATTACH PARTITION public.examresult_p2026_10_pkey;
ALTER INDEX public.idx_examresult_user_taken ATTACH PARTITION public.examresult_p2026_10_user_id_taken_at_idx;

ALTER INDEX public.idx_examresult_deleted_at ATTACH PARTITION public.examresult_p2026_11_deleted_at_idx;
ALTER INDEX public."ExamResult_pkey" ATTACH PARTITION public.examresult_p2026_11_pkey;
ALTER INDEX public.idx_examresult_user_taken ATTACH PARTITION public.examresult_p2026_11_user_id_taken_at_idx;

ALTER INDEX public.idx_examresult_deleted_at ATTACH PARTITION public.examresult_p2026_12_deleted_at_idx;
ALTER INDEX public."ExamResult_pkey" ATTACH PARTITION public.examresult_p2026_12_pkey;
ALTER INDEX public.idx_examresult_user_taken ATTACH PARTITION public.examresult_p2026_12_user_id_taken_at_idx;


--
-- Name: examresult_pdefault_deleted_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_examresult_deleted_at ATTACH PARTITION public.examresult_pdefault_deleted_at_idx;


--
-- Name: examresult_pdefault_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."ExamResult_pkey" ATTACH PARTITION public.examresult_pdefault_pkey;


--
-- Name: examresult_pdefault_user_id_taken_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.idx_examresult_user_taken ATTACH PARTITION public.examresult_pdefault_user_id_taken_at_idx;


--
-- Name: Payment audit_payment_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_payment_delete BEFORE DELETE ON public."Payment" FOR EACH ROW EXECUTE FUNCTION public.audit_delete_payment();


--
-- Name: User audit_user_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_user_delete BEFORE DELETE ON public."User" FOR EACH ROW EXECUTE FUNCTION public.audit_delete_user();


--
-- Name: BlogPost fk_BlogPost_author; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BlogPost"
    ADD CONSTRAINT "fk_BlogPost_author" FOREIGN KEY (author_id) REFERENCES public."User"(id) ON DELETE SET NULL;


--
-- Name: Challenge fk_Challenge_subject; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Challenge"
    ADD CONSTRAINT "fk_Challenge_subject" FOREIGN KEY (subject_id) REFERENCES public."Subject"(id);


--
-- Name: CourseReview fk_CourseReview_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseReview"
    ADD CONSTRAINT "fk_CourseReview_user" FOREIGN KEY (user_id) REFERENCES public."User"(id);


--
-- Name: Question fk_Exam_questions; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Question"
    ADD CONSTRAINT "fk_Exam_questions" FOREIGN KEY (exam_id) REFERENCES public."Exam"(id) ON DELETE CASCADE;


--
-- Name: Exam fk_Exam_subject; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Exam"
    ADD CONSTRAINT "fk_Exam_subject" FOREIGN KEY (subject_id) REFERENCES public."Subject"(id) ON DELETE CASCADE;


--
-- Name: ForumTopic fk_ForumTopic_author; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ForumTopic"
    ADD CONSTRAINT "fk_ForumTopic_author" FOREIGN KEY (author_id) REFERENCES public."User"(id) ON DELETE SET NULL;


--
-- Name: LiveEvent fk_LiveEvent_subject; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LiveEvent"
    ADD CONSTRAINT "fk_LiveEvent_subject" FOREIGN KEY (subject_id) REFERENCES public."Subject"(id);


--
-- Name: Payment fk_Payment_subject; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "fk_Payment_subject" FOREIGN KEY (subject_id) REFERENCES public."Subject"(id) ON DELETE SET NULL;


--
-- Name: SubTopic fk_SubTopic_exam; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SubTopic"
    ADD CONSTRAINT "fk_SubTopic_exam" FOREIGN KEY (exam_id) REFERENCES public."Exam"(id);


--
-- Name: SubjectEnrollment fk_Subject_enrollments; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SubjectEnrollment"
    ADD CONSTRAINT "fk_Subject_enrollments" FOREIGN KEY (subject_id) REFERENCES public."Subject"(id) ON DELETE CASCADE;


--
-- Name: Topic fk_Subject_topics; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Topic"
    ADD CONSTRAINT "fk_Subject_topics" FOREIGN KEY (subject_id) REFERENCES public."Subject"(id) ON DELETE CASCADE;


--
-- Name: Task fk_Task_subject; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "fk_Task_subject" FOREIGN KEY (subject_id) REFERENCES public."Subject"(id);


--
-- Name: SubTopic fk_Topic_sub_topics; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SubTopic"
    ADD CONSTRAINT "fk_Topic_sub_topics" FOREIGN KEY (topic_id) REFERENCES public."Topic"(id) ON DELETE CASCADE;


--
-- Name: UserAchievement fk_UserAchievement_achievement; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserAchievement"
    ADD CONSTRAINT "fk_UserAchievement_achievement" FOREIGN KEY (achievement_id) REFERENCES public."Achievement"(id);


--
-- Name: UserAchievement fk_UserAchievement_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserAchievement"
    ADD CONSTRAINT "fk_UserAchievement_user" FOREIGN KEY (user_id) REFERENCES public."User"(id);


--
-- Name: UserChallenge fk_UserChallenge_challenge; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserChallenge"
    ADD CONSTRAINT "fk_UserChallenge_challenge" FOREIGN KEY (challenge_id) REFERENCES public."Challenge"(id);


--
-- Name: UserChallenge fk_UserChallenge_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserChallenge"
    ADD CONSTRAINT "fk_UserChallenge_user" FOREIGN KEY (user_id) REFERENCES public."User"(id);


--
-- Name: SubjectEnrollment fk_User_enrollments; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SubjectEnrollment"
    ADD CONSTRAINT "fk_User_enrollments" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: TopicProgress fk_User_lesson_progresses; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TopicProgress"
    ADD CONSTRAINT "fk_User_lesson_progresses" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: Payment fk_User_payments; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "fk_User_payments" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: UserSettings fk_User_settings; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserSettings"
    ADD CONSTRAINT "fk_User_settings" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: StudySession fk_User_study_sessions; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudySession"
    ADD CONSTRAINT "fk_User_study_sessions" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: Task fk_User_tasks; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "fk_User_tasks" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: EventAttendee fk_event_attendee_event; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EventAttendee"
    ADD CONSTRAINT fk_event_attendee_event FOREIGN KEY (event_id) REFERENCES public."Event"(id) ON DELETE CASCADE;


--
-- Name: EventAttendee fk_event_attendee_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EventAttendee"
    ADD CONSTRAINT fk_event_attendee_user FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: ExamResult fk_exam_results_exam_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public."ExamResult"
    ADD CONSTRAINT fk_exam_results_exam_id FOREIGN KEY (exam_id) REFERENCES public."Exam"(id) ON DELETE CASCADE;


--
-- Name: ExamResult fk_exam_results_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public."ExamResult"
    ADD CONSTRAINT fk_exam_results_user_id FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: Exam fk_exams_subject_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Exam"
    ADD CONSTRAINT fk_exams_subject_id FOREIGN KEY (subject_id) REFERENCES public."Subject"(id) ON DELETE CASCADE;


--
-- Name: Invoice fk_invoices_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT fk_invoices_user_id FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: Notification fk_notifications_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT fk_notifications_user_id FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: Payment fk_payments_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT fk_payments_user_id FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: Question fk_questions_exam_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Question"
    ADD CONSTRAINT fk_questions_exam_id FOREIGN KEY (exam_id) REFERENCES public."Exam"(id) ON DELETE CASCADE;


--
-- Name: Reminder fk_reminders_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Reminder"
    ADD CONSTRAINT fk_reminders_user_id FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: Schedule fk_schedules_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Schedule"
    ADD CONSTRAINT fk_schedules_user_id FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: SecurityLog fk_security_logs_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SecurityLog"
    ADD CONSTRAINT fk_security_logs_user_id FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: StudySession fk_study_sessions_subject_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudySession"
    ADD CONSTRAINT fk_study_sessions_subject_id FOREIGN KEY (subject_id) REFERENCES public."Subject"(id) ON DELETE SET NULL;


--
-- Name: StudySession fk_study_sessions_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudySession"
    ADD CONSTRAINT fk_study_sessions_user_id FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: SubTopic fk_sub_topics_topic_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SubTopic"
    ADD CONSTRAINT fk_sub_topics_topic_id FOREIGN KEY (topic_id) REFERENCES public."Topic"(id) ON DELETE CASCADE;


--
-- Name: SubjectEnrollment fk_subject_enrollments_subject_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SubjectEnrollment"
    ADD CONSTRAINT fk_subject_enrollments_subject_id FOREIGN KEY (subject_id) REFERENCES public."Subject"(id) ON DELETE CASCADE;


--
-- Name: SubjectEnrollment fk_subject_enrollments_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SubjectEnrollment"
    ADD CONSTRAINT fk_subject_enrollments_user_id FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: Task fk_tasks_subject_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT fk_tasks_subject_id FOREIGN KEY (subject_id) REFERENCES public."Subject"(id) ON DELETE SET NULL;


--
-- Name: Task fk_tasks_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT fk_tasks_user_id FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: TopicProgress fk_topic_progress_subtopic; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TopicProgress"
    ADD CONSTRAINT fk_topic_progress_subtopic FOREIGN KEY (sub_topic_id) REFERENCES public."SubTopic"(id) ON DELETE CASCADE;


--
-- Name: TopicProgress fk_topic_progress_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TopicProgress"
    ADD CONSTRAINT fk_topic_progress_user FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: Topic fk_topics_subject_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Topic"
    ADD CONSTRAINT fk_topics_subject_id FOREIGN KEY (subject_id) REFERENCES public."Subject"(id) ON DELETE CASCADE;


--
-- Name: UserAchievement fk_user_achievements_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserAchievement"
    ADD CONSTRAINT fk_user_achievements_user_id FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: User fk_user_referred_by_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT fk_user_referred_by_id FOREIGN KEY (referred_by_id) REFERENCES public."User"(id) ON DELETE SET NULL;


--
-- Name: UserSettings fk_user_settings_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserSettings"
    ADD CONSTRAINT fk_user_settings_user_id FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: WalletTransaction fk_wallet_transactions_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WalletTransaction"
    ADD CONSTRAINT fk_wallet_transactions_user_id FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict WXtnxb1aVW7LJBowTcfyxOqF9JVrogvCdlMqzUdiOtNApzvNq1Szor1it0sDCb9

