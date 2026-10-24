import { expect, it } from 'vitest'
import { GET } from '../../app/api/invoices/[id]/formal-notice/route'
import { getEmailTemplate } from '../email-templates'
it('retires the unsafe legal generator and its email', () => {
  expect(GET().status).toBe(410)
  expect(() => getEmailTemplate('formal_notice', {} as never)).toThrow('retiré')
})
