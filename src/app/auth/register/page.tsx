import { RegisterForm } from './RegisterForm';

export default function RegisterPage() {
    return <RegisterForm siteKey={process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ?? ''} />;
}
