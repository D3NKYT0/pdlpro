import { configure } from '@testing-library/react'
import { beforeEach } from 'vitest'
import i18n from '../i18n'

/** Coverage instrumentation and CI runners slow async renders past the 1s Testing Library default. */
configure({ asyncUtilTimeout: 5_000 })

/** Keep UI assertions on Portuguese copy unless a test switches language explicitly. */
await i18n.changeLanguage('pt')

beforeEach(async () => {
  if (i18n.resolvedLanguage !== 'pt' && i18n.language !== 'pt') {
    await i18n.changeLanguage('pt')
  }
})
