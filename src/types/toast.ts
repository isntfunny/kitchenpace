export type ToastType = 'success' | 'info' | 'warning' | 'error';

export type ToastAction = {
    label: string;
    href?: string;
    onClick?: () => void;
};

export type ToastInput = {
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    action?: ToastAction;
};

export type Toast = ToastInput & {
    id: string;
    createdAt: Date;
};

export type PublishedToast = {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    action?: {
        label: string;
        href?: string;
    };
    createdAt: string;
};

export const TOAST_STREAM_EVENT = 'toast.created';
