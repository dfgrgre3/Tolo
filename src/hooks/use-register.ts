import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterInput } from "@/lib/validations/auth";
import { registerUser } from "@/lib/api/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useRegister() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<RegisterInput>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
            acceptTerms: false,
        },
    });

    const onSubmit = async (data: RegisterInput) => {
        setIsLoading(true);
        try {
            const response = await registerUser({
                name: data.name,
                email: data.email,
                password: data.password,
                acceptTerms: data.acceptTerms,
            });

            if (response.success) {
                toast.success("تم إنشاء الحساب بنجاح");
                if (response.requiresEmailVerification) {
                    toast.info("يرجى التحقق من بريدك الإلكتروني");
                    // Redirect to verify email page
                    router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
                } else {
                    // Or redirect to login
                    router.push("/login");
                }
                router.refresh();
            }
        } catch (error: any) {
            console.error("Registration error:", error);
            const message = error?.error || error?.message || "حدث خطأ أثناء إنشاء الحساب";
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
    };
}
