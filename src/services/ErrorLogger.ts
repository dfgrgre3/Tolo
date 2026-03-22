import { errorService } from '@/lib/logging/error-service';

export type { 
  ErrorLogEntry, 
  ErrorSeverity 
} from '@/lib/logging/error-service';

export const ErrorLogger = errorService;
export default errorService;
