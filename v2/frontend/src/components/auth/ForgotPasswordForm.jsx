import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { VALIDATION_RULES } from '../../constants'
import { isEmail } from '../../utils'

const ForgotPasswordForm = () => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  
  const { forgotPassword, isLoading } = useAuthStore()
  
  const validateEmail = () => {
    if (!email) {
      setError('Email is required')
      return false
    }
    
    if (!isEmail(email)) {
      setError(VALIDATION_RULES.EMAIL.message)
      return false
    }
    
    setError('')
    return true
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateEmail()) {
      return
    }
    
    try {
      await forgotPassword(email)
      setIsSubmitted(true)
    } catch (error) {
      // Error is handled by the store and displayed via toast
      console.error('Forgot password failed:', error)
    }
  }
  
  const handleChange = (e) => {
    setEmail(e.target.value)
    
    // Clear error when user starts typing
    if (error) {
      setError('')
    }
  }
  
  const handleResend = async () => {
    try {
      await forgotPassword(email)
    } catch (error) {
      console.error('Resend failed:', error)
    }
  }
  
  if (isSubmitted) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 mb-6">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Check Your Email
            </h1>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We've sent a password reset link to{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {email}
              </span>
            </p>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Didn't receive the email? Check your spam folder or
              </p>
              
              <button
                onClick={handleResend}
                disabled={isLoading}
                className="
                  inline-flex items-center px-4 py-2 border border-transparent rounded-lg
                  text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100
                  dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/30
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-200
                "
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Sending...
                  </>
                ) : (
                  'Resend email'
                )}
              </button>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Link
                to="/auth/login"
                className="
                  inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900
                  dark:text-gray-400 dark:hover:text-white transition-colors duration-200
                "
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Forgot Password?
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={handleChange}
                className={`
                  block w-full pl-10 pr-3 py-3 border rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  transition-colors duration-200
                  ${error 
                    ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-500' 
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                  }
                  text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                `}
                placeholder="Enter your email address"
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="
              w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg
              text-sm font-medium text-white bg-blue-600 hover:bg-blue-700
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
            "
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Sending reset link...
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>
        
        {/* Back to Login */}
        <div className="mt-6 text-center">
          <Link
            to="/auth/login"
            className="
              inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900
              dark:text-gray-400 dark:hover:text-white transition-colors duration-200
            "
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to sign in
          </Link>
        </div>
        
        {/* Help Text */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <Mail className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Need help?
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p>
                  If you don't receive an email within a few minutes, check your spam folder or{' '}
                  <Link
                    to="/support"
                    className="font-medium underline hover:no-underline"
                  >
                    contact support
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordForm