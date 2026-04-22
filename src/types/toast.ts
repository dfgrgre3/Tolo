
export type ToastType = 'success' | 'warning' | 'error';

export type ToastProps = {
    message: string;
    type?: ToastType;
    onDismiss: () => void;
};

export type ToastContainerProps = {
    toasts: Array<{ id: string; message: string; type?: ToastType }>;
    onDismiss: (id: string) => void;
};
