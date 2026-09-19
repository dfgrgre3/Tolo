/**
 * Shared UI Layer — المكونات الأساسية المشتركة
 *
 * هذا هو المسار الـ Canonical الجديد للمكونات الأساسية.
 * يعيد تصدير كل شيء من `@/components/ui` بدون كسر أي import قديم.
 *
 * @canonical `@/shared/ui`
 * @legacy `@/components/ui/*` لا يزال يعمل
 */

// Base components
export { Button, buttonVariants } from "@/components/ui/button";
export type { ButtonProps } from "@/components/ui/button";
export { Input } from "@/components/ui/input";
export { Textarea } from "@/components/ui/textarea";
export { Label } from "@/components/ui/label";
export { Checkbox } from "@/components/ui/checkbox";
export { Switch } from "@/components/ui/switch";
export { Badge, badgeVariants } from "@/components/ui/badge";
export { Progress } from "@/components/ui/progress";
export { Separator } from "@/components/ui/separator";
export { Skeleton } from "@/components/ui/skeleton";
export { ScrollArea } from "@/components/ui/scroll-area";

// Layout components
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// Overlay components
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Navigation
export { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Form system
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Data display
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// UX utilities
export { LoadingSpinner, LoadingPage, UnifiedLayoutSkeleton } from "@/components/ui/loading-state";
export { PageContainer } from "@/components/ui/page-container";
