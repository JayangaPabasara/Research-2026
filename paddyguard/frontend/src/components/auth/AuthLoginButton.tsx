import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import AuthTranslationIcon from './AuthTranslationIcon'

export default function AuthLoginButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  const { t } = useTranslation()
  return <Button type="submit" size="lg" className="pg-auth-login w-full" loading={loading} aria-busy={loading}>
    {!loading && <AuthTranslationIcon />}
    <span role="status">{loading ? t('auth.signingIn') : children}</span>
  </Button>
}
