import type { UpdateProfilePayload } from "@/types/user";

export interface ProfileFormState {
  name: string;
  username: string;
  phone: string;
  alternativePhone: string;
  country: string;
  city: string;
  gender: string;
  school: string;
  gradeLevel: string;
  educationType: string;
  section: string;
  birthDate: string;
  bio: string;
  studyGoal: string;
}

/** Builds a PATCH while preserving explicit empty-string clears. */
export function buildProfilePatch(
  state: ProfileFormState,
  initial: ProfileFormState | null,
): UpdateProfilePayload {
  if (!initial) return {};

  const pick = <K extends keyof ProfileFormState>(key: K) =>
    state[key] !== initial[key] ? state[key].trim() : undefined;

  const patch: UpdateProfilePayload = {
    name: pick("name"),
    username: pick("username"),
    phone: pick("phone"),
    alternativePhone: pick("alternativePhone"),
    country: pick("country"),
    city: pick("city"),
    gender: pick("gender"),
    school: pick("school"),
    gradeLevel: pick("gradeLevel"),
    educationType: pick("educationType"),
    section: pick("section"),
    birthDate: pick("birthDate"),
    bio: pick("bio"),
    studyGoal: pick("studyGoal"),
  };

  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as UpdateProfilePayload;
}
