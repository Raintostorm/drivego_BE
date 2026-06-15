import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { LicenseProvider } from './context/LicenseContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <LicenseProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </LicenseProvider>
    </AuthProvider>
  </StrictMode>,
)
