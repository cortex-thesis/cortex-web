import { InputField } from './components/molecules'

function App() {
  return (
    <div
      style={{
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        maxWidth: '340px',
      }}
    >
      <InputField
        label="Full name"
        placeholder="Enter your name"
        helperText="As it appears on your school record"
      />

      <InputField
        label="Email"
        type="email"
        placeholder="you@school.edu"
        fieldState="error"
        errorText="Please enter a valid email address"
        required
      />

      <InputField
        label="Email"
        type="email"
        placeholder="you@school.edu"
        fieldState="success"
        successText="Looks good!"
        defaultValue="sofia@cortex.edu"
      />

      <InputField
        label="Password"
        type="password"
        placeholder="Enter password"
        required
      />

      <InputField label="School" defaultValue="Cannot change this" disabled />
    </div>
  )
}

export default App
