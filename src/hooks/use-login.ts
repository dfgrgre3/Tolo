import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/validations/auth";
import { loginUser } from "@/lib/api/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

export function useLogin() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    // 2FA State
    const [showTwoFactor, setShowTwoFactor] = useState(false);
    const [loginAttemptId, setLoginAttemptId] = useState<string | null>(null);

    const form = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
            rememberMe: false,
        },
    });

    const onSubmit = async (data: LoginInput) => {
        setIsLoading(true);
        try {
            const response = await loginUser({
                email: data.email,
                password: data.password,
                rememberMe: data.rememberMe,
            });

            // Handle 2FA
            if (response.requiresTwoFactor && response.loginAttemptId) {
                setLoginAttemptId(response.loginAttemptId);
                setShowTwoFactor(true);
                toast.info("يرجى إدخال رمز التحقق");
                return;
            }

            // Success
            if (response.user) {
                login(response.user);
                toast.success("تم تسجيل الدخول بنجاح");

                const redirect = searchParams.get("redirect") || "/dashboard";
                router.push(redirect);
                router.refresh();
            }
        } catch (error: any) {
            console.error("Login error:", error instanceof Error ? error.message : error);
            const message = error?.error || error?.message || "حدث خطأ أثناء تسجيل الدخول";
            toast.error(message);
            form.setError("root", { message });
        } finally {
            setIsLoading(false);
        }
    };

    return {
        form,
        onSubmit: form.handleSubmit(onSubmit),
        isLoading,
        showTwoFactor,
        loginAttemptId,
        setShowTwoFactor,
    };
}
