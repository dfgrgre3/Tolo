import React from 'react';
import { AlertTriangle, Wifi, Shield, FileX, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';

export type ErrorType =
  | 'generic'
  | 'network'
  | 'auth'
  | 'permission'
  | 'not-found'
  | 'server'
  | 'validation'
  | 'timeout';

interface ErrorPageProps {
  type: ErrorType;
  title?: string;
  message?: string;
  errorId?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  onGoBack?: () => void;
  showDetails?: boolean;
  error?: Error;
}

const ErrorPage: React.FC<ErrorPageProps> = ({
  type,
  title,
  message,
  errorId,
  onRetry,
  onGoHome,
  onGoBack,
  showDetails = false,
  error,
}) => {
  const getErrorConfig = (errorType: ErrorType) => {
    switch (errorType) {
      case 'network':
        return {
          icon: <Wifi className="h-16 w-16 text-blue-500" />,
          defaultTitle: 'مشكلة في الاتصال',
          defaultMessage: 'لا يمكن الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
          bgColor: 'bg-blue-50',
          iconBg: 'bg-blue-100',
          actions: ['retry', 'home'],
        };
      case 'auth':
        return {
          icon: <Shield className="h-16 w-16 text-red-500" />,
          defaultTitle: 'انتهت صلاحية الجلسة',
          defaultMessage: 'انتهت صلاحية جلستك. يرجى تسجيل الدخول مرة أخرى للمتابعة.',
          bgColor: 'bg-red-50',
          iconBg: 'bg-red-100',
          actions: ['login', 'home'],
        };
      case 'permission':
        return {
          icon: <Shield className="h-16 w-16 text-orange-500" />,
          defaultTitle: 'غير مصرح لك بالوصول',
          defaultMessage: 'ليس لديك صلاحية للوصول إلى هذه الصفحة أو تنفيذ هذا الإجراء.',
          bgColor: 'bg-orange-50',
          iconBg: 'bg-orange-100',
          actions: ['back', 'home'],
        };
      case 'not-found':
        return {
          icon: <FileX className="h-16 w-16 text-gray-500" />,
          defaultTitle: 'الصفحة غير موجودة',
          defaultMessage: 'الصفحة التي تبحث عنها غير موجودة أو تم نقلها.',
          bgColor: 'bg-gray-50',
          iconBg: 'bg-gray-100',
          actions: ['back', 'home'],
        };
      case 'server':
        return {
          icon: <AlertTriangle className="h-16 w-16 text-red-500" />,
          defaultTitle: 'خطأ في الخادم',
          defaultMessage: 'حدث خطأ داخلي في الخادم. فريقنا يعمل على حل المشكلة.',
          bgColor: 'bg-red-50',
          iconBg: 'bg-red-100',
          actions: ['retry', 'home'],
        };
      case 'validation':
        return {
          icon: <AlertTriangle className="h-16 w-16 text-yellow-500" />,
          defaultTitle: 'خطأ في البيانات',
          defaultMessage: 'البيانات المدخلة غير صحيحة. يرجى التحقق من الحقول المطلوبة.',
          bgColor: 'bg-yellow-50',
          iconBg: 'bg-yellow-100',
          actions: ['back', 'retry'],
        };
      case 'timeout':
        return {
          icon: <RefreshCw className="h-16 w-16 text-orange-500" />,
          defaultTitle: 'انتهت مهلة الطلب',
          defaultMessage: 'استغرق الطلب وقتاً أطول من المتوقع. يرجى المحاولة مرة أخرى.',
          bgColor: 'bg-orange-50',
          iconBg: 'bg-orange-100',
          actions: ['retry', 'home'],
        };
      default:
        return {
          icon: <AlertTriangle className="h-16 w-16 text-red-500" />,
          defaultTitle: 'حدث خطأ غير متوقع',
          defaultMessage: 'نعتذر عن هذا الإزعاج. فريقنا يعمل على حل المشكلة.',
          bgColor: 'bg-red-50',
          iconBg: 'bg-red-100',
          actions: ['retry', 'home'],
        };
    }
  };

  const config = getErrorConfig(type);
  const displayTitle = title || config.defaultTitle;
  const displayMessage = message || config.defaultMessage;

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  const handleGoBack = () => {
    if (onGoBack) {
      onGoBack();
    } else {
      window.history.back();
    }
  };

  const handleLogin = () => {
    window.location.href = '/login';
  };

  const renderActions = () => {
    return (
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {config.actions.includes('retry') && (
          <Button onClick={handleRetry} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        )}
        {config.actions.includes('back') && (
          <Button variant="outline" onClick={handleGoBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            العودة
          </Button>
        )}
        {config.actions.includes('home') && (
          <Button variant="outline" onClick={handleGoHome} className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            الصفحة الرئيسية
          </Button>
        )}
        {config.actions.includes('login') && (
          <Button onClick={handleLogin} className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            تسجيل الدخول
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 ${config.bgColor}`} dir="rtl">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className={`flex items-center justify-center h-24 w-24 rounded-full ${config.iconBg}`}>
            {config.icon}
          </div>
        </div>

        <div className="mt-6 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">{displayTitle}</h1>
          <p className="mt-2 text-sm text-gray-600 max-w-sm mx-auto">{displayMessage}</p>
          {errorId && (
            <p className="mt-2 text-xs text-gray-500">رمز الخطأ: {errorId}</p>
          )}
        </div>

        <div className="mt-8">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 text-center">ماذا يمكنك فعله؟</h3>
                <div className="mt-4">
                  {renderActions()}
                </div>
              </div>

              {showDetails && error && (
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    تفاصيل الخطأ (للمطورين)
                  </summary>
                  <div className="mt-3 p-4 bg-gray-50 rounded-md">
                    <div className="text-xs text-gray-800 space-y-2">
                      <div>
                        <span className="font-semibold">الخطأ:</span> {error.message}
                      </div>
                      {error.stack && (
                        <div>
                          <span className="font-semibold">المكدس:</span>
                          <pre className="mt-1 whitespace-pre-wrap text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                            {error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
