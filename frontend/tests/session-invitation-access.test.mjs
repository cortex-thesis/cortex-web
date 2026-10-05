import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/components/organisms/student/ClassSessionInvitation.tsx', import.meta.url), 'utf8')
const gate = source.slice(source.indexOf('export default function'), source.indexOf('function StudentInvitations'))
const { outputText } = ts.transpileModule(`const useAuthStore=selector=>selector(globalThis.__invitationAuth); const useLocation=()=>({pathname:globalThis.__invitationPath}); function StudentInvitations() {} ${gate}`, { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } })
const { default: Gate } = await import(`data:text/javascript;base64,${Buffer.from(outputText.replace('"react/jsx-runtime"', JSON.stringify(import.meta.resolve('react/jsx-runtime')))).toString('base64')}`)

test('session invitations mount only for verified students on student pages', () => {
  try {
    const valid = { user: { id: 'student-1', role: 'student' }, isAuthenticated: true, isInitialized: true }
    for (const path of ['/', '/login', '/teacher/login', '/admin/login', '/teacher/dashboard', '/student/class-session/lobby']) {
      globalThis.__invitationAuth = valid; globalThis.__invitationPath = path
      assert.equal(Gate(), null, path)
    }
    globalThis.__invitationPath = '/student/home'
    for (const auth of [{ ...valid, isInitialized: false }, { ...valid, isAuthenticated: false }, { ...valid, user: null }, ...['teacher', 'school_admin', 'super_admin'].map(role => ({ ...valid, user: { id: 'other', role } }))]) {
      globalThis.__invitationAuth = auth
      assert.equal(Gate(), null)
    }
    globalThis.__invitationAuth = valid
    assert.equal(Gate().key, 'student-1')
    globalThis.__invitationAuth = { ...valid, user: { id: 'student-2', role: 'student' } }
    assert.equal(Gate().key, 'student-2', 'Different students must mount fresh invitation state')
  } finally { delete globalThis.__invitationAuth; delete globalThis.__invitationPath }
})
