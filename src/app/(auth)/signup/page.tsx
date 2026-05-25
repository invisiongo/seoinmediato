// This route is deprecated. Use /register instead.
import { redirect } from 'next/navigation'

export default function DeprecatedSignupPage() {
  redirect('/register')
}
