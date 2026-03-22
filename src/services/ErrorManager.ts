import { errorService } from '@/lib/logging/error-service';

export type { 
  ErrorLogEntry, 
  ErrorConfig, 
  ErrorDisplayOptions,
  ErrorSeverity
} from '@/lib/logging/error-service';

export const ErrorManager = errorService;
export default errorService;