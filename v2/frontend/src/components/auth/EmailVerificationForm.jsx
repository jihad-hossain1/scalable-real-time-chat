import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Mail, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const EmailVerificationForm = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const email = searchParams.get('email')
  
  const [verificationStatus, setVerificationStatus] = useState('pending') // pending, success, error
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  
  const { verifyEmail, resendVerificationEmail, isLoading, user } = useAuthStore()
  
  useEffect(() => {
    if (token) {
      handleVerification()
    }
  }, [token])
  
  useEffect(() => {
    let interval
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown(prev => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [resendCooldown])
  
  const handleVerification = async () => {
    try {
      await verifyEmail(token)
      setVerificationStatus('success')
      
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/dashboard')
      }, 3000)
    } catch (error) {
      setVerificationStatus('error')
      console.error('Email verification failed:', error)
    }
  }
  
  const handleResendVerification = async () => {
    if (resendCooldown > 0 || !email) return
    
    setIsResending(true)
    try {
      await resendVerificationEmail(email)
      setResendCooldown(60) // 60 seconds cooldown
    } catch (error) {
      console.error('Resend verification failed:', error)
    } finally {
      setIsResending(false)
    }
  }
  
  const renderVerificationPending = () => (
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/20 mb-6">
        <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
      
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Verifying Your Email
      </h1>
      
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Please wait while we verify your email address...
      </p>
    </div>
  )
  
  const renderVerificationSuccess = () => (
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 mb-6">
        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Email Verified Successfully!
      </h1>
      
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Your email has been verified. You will be redirected to your dashboard in a few seconds.
      </p>
      
      <Link
        to="/dashboard"
        className="
          inline-flex items-center px-4 py-2 border border-transparent rounded-lg
          text-sm font-medium text-white bg-blue-600 hover:bg-blue-700
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          transition-colors duration-200
        "
      >
        Go to Dashboard
      </Link>
    </div>
  )
  
  const renderVerificationError = () => (
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-6">
        <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Verification Failed
      </h1>
      
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        The verification link is invalid or has expired. Please request a new verification email.
      </p>
      
      {email && (
        <div className="space-y-4">
          <button
            onClick={handleResendVerification}
            disabled={isResending || resendCooldown > 0}
            className="
              w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg
              text-sm font-medium text-white bg-blue-600 hover:bg-blue-700
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
            "
          >
            {isResending ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Sending...
              </>
            ) : resendCooldown > 0 ? (
              <>
                <RefreshCw className="-ml-1 mr-2 h-4 w-4" />
                Resend in {resendCooldown}s
              </>
            ) : (
              <>
                <RefreshCw className="-ml-1 mr-2 h-4 w-4" />
                Resend Verification Email
              </>
            )}
          </button>
          
          <p className="text-xs text-gray-500 dark:text-gray-400">
            We'll send a new verification email to {email}
          </p>
        </div>
      )}
      
      <div className="mt-6">
        <Link
          to="/auth/login"
          className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors duration-200"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  )
  
  const renderEmailVerificationPrompt = () => (
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/20 mb-6">
        <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
      </div>
      
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Verify Your Email
      </h1>
      
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        We've sent a verification email to your address. Please check your inbox and click the verification link to activate your account.
      </p>
      
      {user?.email && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Verification email sent to:
          </p>
          <p className="font-medium text-gray-900 dark:text-white">
            {user.email}
          </p>
        </div>
      )}
      
      <div className="space-y-4">
        <button
          onClick={handleResendVerification}
          disabled={isResending || resendCooldown > 0 || !user?.email}
          className="
            w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg
            text-sm font-medium text-white bg-blue-600 hover:bg-blue-700
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
          "
        >
          {isResending ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
              Sending...
            </>
          ) : resendCooldown > 0 ? (
            <>
              <RefreshCw className="-ml-1 mr-2 h-4 w-4" />
              Resend in {resendCooldown}s
            </>
          ) : (
            <>
              <RefreshCw className="-ml-1 mr-2 h-4 w-4" />
              Resend Verification Email
            </>
          )}
        </button>
        
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>Didn't receive the email? Check your spam folder.</p>
          <p>The verification link will expire in 24 hours.</p>
        </div>
      </div>
      
      <div className="mt-6 space-y-2">
        <Link
          to="/auth/login"
          className="block text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors duration-200"
        >
          Back to sign in
        </Link>
        
        <Link
          to="/auth/register"
          className="block text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors duration-200"
        >
          Use a different email
        </Link>
      </div>
    </div>
  )
  
  const renderContent = () => {
    if (token) {
      switch (verificationStatus) {
        case 'pending':
          return renderVerificationPending()
        case 'success':
          return renderVerificationSuccess()
        case 'error':
          return renderVerificationError()
        default:
          return renderVerificationPending()
      }
    } else {
      return renderEmailVerificationPrompt()
    }
  }
  
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8">
        {renderContent()}
      </div>
    </div>
  )
}

export default EmailVerificationForm