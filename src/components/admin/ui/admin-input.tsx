"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Search, X, Eye, EyeOff } from "lucide-react";

const inputVariants = cva(
  "flex w-full rounded-lg border bg-background text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-input focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        filled: "border-transparent bg-muted focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring",
        underline: "rounded-none border-0 border-b-2 border-input bg-transparent focus-visible:border-primary",
        ghost: "border-transparent bg-transparent hover:bg-muted focus-visible:bg-muted focus-visible:ring-1",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-4",
        lg: "h-12 px-5 text-base",
      },
      inputSize: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-4",
        lg: "h-12 px-5 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface AdminInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  icon?: React.ElementType;
  iconPosition?: "start" | "end";
  error?: string;
  success?: boolean;
  clearable?: boolean;
  onClear?: () => void;
  rightElement?: React.ReactNode;
  leftElement?: React.ReactNode;
}

const AdminInput = React.forwardRef<HTMLInputElement, AdminInputProps>(
  (
    {
      className,
      variant,
      size,
      type,
      icon: Icon,
      iconPosition = "start",
      error,
      success,
      clearable,
      onClear,
      rightElement,
      leftElement,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === "password";

    return (
      <div className="relative w-full">
        {Icon && iconPosition === "start" && (
          <Icon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        {leftElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{leftElement}</div>
        )}
        <input
          type={isPassword && showPassword ? "text" : type}
          className={cn(
            inputVariants({ variant, size }),
            Icon && iconPosition === "start" && "pr-10",
            Icon && iconPosition === "end" && "pl-10",
            leftElement && "pr-10",
            (clearable || rightElement || isPassword) && "pl-10",
            error && "border-red-500 focus-visible:ring-red-500",
            success && "border-green-500 focus-visible:ring-green-500",
            className
          )}
          ref={ref}
          {...props}
        />
        {clearable && props.value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        {rightElement && !isPassword && !clearable && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2">{rightElement}</div>
        )}
        {Icon && iconPosition === "end" && !rightElement && !isPassword && !clearable && (
          <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  }
);
AdminInput.displayName = "AdminInput";

// Search Input
interface SearchInputProps extends Omit<AdminInputProps, "icon" | "iconPosition"> {
  onSearch?: (value: string) => void;
  debounce?: number;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, debounce = 300, ...props }, ref) => {
    const [value, setValue] = React.useState(props.value as string || "");

    React.useEffect(() => {
      const timer = setTimeout(() => {
        onSearch?.(value);
      }, debounce);
      return () => clearTimeout(timer);
    }, [value, debounce, onSearch]);

    return (
      <AdminInput
        ref={ref}
        icon={Search}
        iconPosition="start"
        clearable
        onClear={() => {
          setValue("");
          onSearch?.("");
        }}
        {...props}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          props.onChange?.(e);
        }}
        placeholder={props.placeholder || "بحث..."}
      />
    );
  }
);
SearchInput.displayName = "SearchInput";

// Textarea
interface AdminTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof inputVariants> {
  error?: string;
  resize?: "none" | "vertical" | "horizontal" | "both";
}

const AdminTextarea = React.forwardRef<HTMLTextAreaElement, AdminTextareaProps>(
  ({ className, variant, error, resize = "vertical", ...props }, ref) => {
    return (
      <div className="relative w-full">
        <textarea
          className={cn(
            inputVariants({ variant }),
            "min-h-[80px] py-3",
            resize === "none" && "resize-none",
            resize === "vertical" && "resize-y",
            resize === "horizontal" && "resize-x",
            resize === "both" && "resize",
            error && "border-red-500 focus-visible:ring-red-500",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  }
);
AdminTextarea.displayName = "AdminTextarea";

// Form Field wrapper
interface FormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  error,
  required,
  hint,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

export { AdminInput, SearchInput, AdminTextarea, inputVariants };
