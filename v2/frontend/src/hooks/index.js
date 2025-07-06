import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { debounce, throttle } from '../utils'

// Network status hook
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [downlink, setDownlink] = useState(null)
  const [effectiveType, setEffectiveType] = useState(null)
  
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    
    const updateNetworkInfo = () => {
      if ('connection' in navigator) {
        const connection = navigator.connection
        setDownlink(connection.downlink)
        setEffectiveType(connection.effectiveType)
      }
    }
    
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', updateNetworkInfo)
      updateNetworkInfo()
    }
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
      
      if ('connection' in navigator) {
        navigator.connection.removeEventListener('change', updateNetworkInfo)
      }
    }
  }, [])
  
  return {
    isOnline,
    downlink,
    effectiveType,
    isSlowConnection: effectiveType === 'slow-2g' || effectiveType === '2g'
  }
}

// Page visibility hook
export const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden)
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden)
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
  
  return isVisible
}

// Local storage hook
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })
  
  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error)
    }
  }, [key, storedValue])
  
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
      setStoredValue(initialValue)
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error)
    }
  }, [key, initialValue])
  
  return [storedValue, setValue, removeValue]
}

// Session storage hook
export const useSessionStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.sessionStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.warn(`Error reading sessionStorage key "${key}":`, error)
      return initialValue
    }
  })
  
  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.sessionStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.warn(`Error setting sessionStorage key "${key}":`, error)
    }
  }, [key, storedValue])
  
  const removeValue = useCallback(() => {
    try {
      window.sessionStorage.removeItem(key)
      setStoredValue(initialValue)
    } catch (error) {
      console.warn(`Error removing sessionStorage key "${key}":`, error)
    }
  }, [key, initialValue])
  
  return [storedValue, setValue, removeValue]
}

// Debounced value hook
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value)
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])
  
  return debouncedValue
}

// Throttled value hook
export const useThrottle = (value, limit) => {
  const [throttledValue, setThrottledValue] = useState(value)
  const lastRan = useRef(Date.now())
  
  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value)
        lastRan.current = Date.now()
      }
    }, limit - (Date.now() - lastRan.current))
    
    return () => {
      clearTimeout(handler)
    }
  }, [value, limit])
  
  return throttledValue
}

// Previous value hook
export const usePrevious = (value) => {
  const ref = useRef()
  
  useEffect(() => {
    ref.current = value
  })
  
  return ref.current
}

// Toggle hook
export const useToggle = (initialValue = false) => {
  const [value, setValue] = useState(initialValue)
  
  const toggle = useCallback(() => setValue(v => !v), [])
  const setTrue = useCallback(() => setValue(true), [])
  const setFalse = useCallback(() => setValue(false), [])
  
  return [value, toggle, setTrue, setFalse]
}

// Counter hook
export const useCounter = (initialValue = 0, step = 1) => {
  const [count, setCount] = useState(initialValue)
  
  const increment = useCallback(() => setCount(c => c + step), [step])
  const decrement = useCallback(() => setCount(c => c - step), [step])
  const reset = useCallback(() => setCount(initialValue), [initialValue])
  const set = useCallback((value) => setCount(value), [])
  
  return {
    count,
    increment,
    decrement,
    reset,
    set
  }
}

// Array hook
export const useArray = (initialArray = []) => {
  const [array, setArray] = useState(initialArray)
  
  const push = useCallback((element) => {
    setArray(arr => [...arr, element])
  }, [])
  
  const filter = useCallback((callback) => {
    setArray(arr => arr.filter(callback))
  }, [])
  
  const update = useCallback((index, newElement) => {
    setArray(arr => [
      ...arr.slice(0, index),
      newElement,
      ...arr.slice(index + 1)
    ])
  }, [])
  
  const remove = useCallback((index) => {
    setArray(arr => [
      ...arr.slice(0, index),
      ...arr.slice(index + 1)
    ])
  }, [])
  
  const clear = useCallback(() => setArray([]), [])
  
  return {
    array,
    set: setArray,
    push,
    filter,
    update,
    remove,
    clear
  }
}

// Async hook
export const useAsync = (asyncFunction, immediate = true) => {
  const [status, setStatus] = useState('idle')
  const [value, setValue] = useState(null)
  const [error, setError] = useState(null)
  
  const execute = useCallback(async (...args) => {
    setStatus('pending')
    setValue(null)
    setError(null)
    
    try {
      const response = await asyncFunction(...args)
      setValue(response)
      setStatus('success')
      return response
    } catch (error) {
      setError(error)
      setStatus('error')
      throw error
    }
  }, [asyncFunction])
  
  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [execute, immediate])
  
  return {
    execute,
    status,
    value,
    error,
    isIdle: status === 'idle',
    isPending: status === 'pending',
    isSuccess: status === 'success',
    isError: status === 'error'
  }
}

// Fetch hook
export const useFetch = (url, options = {}) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(url, options)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [url, options])
  
  useEffect(() => {
    if (url) {
      fetchData()
    }
  }, [fetchData, url])
  
  return { data, loading, error, refetch: fetchData }
}

// Interval hook
export const useInterval = (callback, delay) => {
  const savedCallback = useRef()
  
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])
  
  useEffect(() => {
    const tick = () => {
      savedCallback.current()
    }
    
    if (delay !== null) {
      const id = setInterval(tick, delay)
      return () => clearInterval(id)
    }
  }, [delay])
}

// Timeout hook
export const useTimeout = (callback, delay) => {
  const savedCallback = useRef()
  
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])
  
  useEffect(() => {
    const tick = () => {
      savedCallback.current()
    }
    
    if (delay !== null) {
      const id = setTimeout(tick, delay)
      return () => clearTimeout(id)
    }
  }, [delay])
}

// Window size hook
export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  })
  
  useEffect(() => {
    const handleResize = throttle(() => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }, 100)
    
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])
  
  return windowSize
}

// Media query hook
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches
    }
    return false
  })
  
  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const handler = (event) => setMatches(event.matches)
    
    mediaQuery.addEventListener('change', handler)
    
    return () => {
      mediaQuery.removeEventListener('change', handler)
    }
  }, [query])
  
  return matches
}

// Scroll position hook
export const useScrollPosition = () => {
  const [scrollPosition, setScrollPosition] = useState({
    x: window.pageXOffset,
    y: window.pageYOffset
  })
  
  useEffect(() => {
    const handleScroll = throttle(() => {
      setScrollPosition({
        x: window.pageXOffset,
        y: window.pageYOffset
      })
    }, 100)
    
    window.addEventListener('scroll', handleScroll)
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])
  
  return scrollPosition
}

// Click outside hook
export const useClickOutside = (ref, handler) => {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return
      }
      handler(event)
    }
    
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])
}

// Keyboard shortcut hook
export const useKeyboardShortcut = (keys, callback, options = {}) => {
  const { target = document, event = 'keydown' } = options
  
  useEffect(() => {
    const handler = (e) => {
      const pressedKeys = []
      
      if (e.ctrlKey) pressedKeys.push('ctrl')
      if (e.shiftKey) pressedKeys.push('shift')
      if (e.altKey) pressedKeys.push('alt')
      if (e.metaKey) pressedKeys.push('meta')
      
      pressedKeys.push(e.key.toLowerCase())
      
      const normalizedKeys = keys.map(key => key.toLowerCase())
      
      if (normalizedKeys.every(key => pressedKeys.includes(key))) {
        e.preventDefault()
        callback(e)
      }
    }
    
    target.addEventListener(event, handler)
    
    return () => {
      target.removeEventListener(event, handler)
    }
  }, [keys, callback, target, event])
}

// Hover hook
export const useHover = () => {
  const [isHovered, setIsHovered] = useState(false)
  
  const ref = useRef(null)
  
  const handleMouseEnter = useCallback(() => setIsHovered(true), [])
  const handleMouseLeave = useCallback(() => setIsHovered(false), [])
  
  useEffect(() => {
    const node = ref.current
    if (node) {
      node.addEventListener('mouseenter', handleMouseEnter)
      node.addEventListener('mouseleave', handleMouseLeave)
      
      return () => {
        node.removeEventListener('mouseenter', handleMouseEnter)
        node.removeEventListener('mouseleave', handleMouseLeave)
      }
    }
  }, [handleMouseEnter, handleMouseLeave])
  
  return [ref, isHovered]
}

// Focus hook
export const useFocus = () => {
  const [isFocused, setIsFocused] = useState(false)
  
  const ref = useRef(null)
  
  const handleFocus = useCallback(() => setIsFocused(true), [])
  const handleBlur = useCallback(() => setIsFocused(false), [])
  
  useEffect(() => {
    const node = ref.current
    if (node) {
      node.addEventListener('focus', handleFocus)
      node.addEventListener('blur', handleBlur)
      
      return () => {
        node.removeEventListener('focus', handleFocus)
        node.removeEventListener('blur', handleBlur)
      }
    }
  }, [handleFocus, handleBlur])
  
  return [ref, isFocused]
}

// Copy to clipboard hook
export const useCopyToClipboard = () => {
  const [copiedText, setCopiedText] = useState(null)
  
  const copy = useCallback(async (text) => {
    if (!navigator?.clipboard) {
      console.warn('Clipboard not supported')
      return false
    }
    
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(text)
      return true
    } catch (error) {
      console.warn('Copy failed', error)
      setCopiedText(null)
      return false
    }
  }, [])
  
  return [copiedText, copy]
}

// Geolocation hook
export const useGeolocation = (options = {}) => {
  const [location, setLocation] = useState({
    loading: true,
    accuracy: null,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    latitude: null,
    longitude: null,
    speed: null,
    timestamp: null,
    error: null
  })
  
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        loading: false,
        error: new Error('Geolocation is not supported')
      }))
      return
    }
    
    const handleSuccess = (position) => {
      const { coords, timestamp } = position
      
      setLocation({
        loading: false,
        accuracy: coords.accuracy,
        altitude: coords.altitude,
        altitudeAccuracy: coords.altitudeAccuracy,
        heading: coords.heading,
        latitude: coords.latitude,
        longitude: coords.longitude,
        speed: coords.speed,
        timestamp,
        error: null
      })
    }
    
    const handleError = (error) => {
      setLocation(prev => ({
        ...prev,
        loading: false,
        error
      }))
    }
    
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      options
    )
  }, [options])
  
  return location
}

// Battery hook
export const useBattery = () => {
  const [battery, setBattery] = useState({
    supported: false,
    loading: true,
    level: null,
    charging: null,
    chargingTime: null,
    dischargingTime: null
  })
  
  useEffect(() => {
    if (!('getBattery' in navigator)) {
      setBattery(prev => ({
        ...prev,
        supported: false,
        loading: false
      }))
      return
    }
    
    navigator.getBattery().then((battery) => {
      const updateBatteryInfo = () => {
        setBattery({
          supported: true,
          loading: false,
          level: battery.level,
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        })
      }
      
      updateBatteryInfo()
      
      battery.addEventListener('chargingchange', updateBatteryInfo)
      battery.addEventListener('levelchange', updateBatteryInfo)
      battery.addEventListener('chargingtimechange', updateBatteryInfo)
      battery.addEventListener('dischargingtimechange', updateBatteryInfo)
      
      return () => {
        battery.removeEventListener('chargingchange', updateBatteryInfo)
        battery.removeEventListener('levelchange', updateBatteryInfo)
        battery.removeEventListener('chargingtimechange', updateBatteryInfo)
        battery.removeEventListener('dischargingtimechange', updateBatteryInfo)
      }
    })
  }, [])
  
  return battery
}

// Idle hook
export const useIdle = (timeout = 60000) => {
  const [isIdle, setIsIdle] = useState(false)
  
  useEffect(() => {
    let timeoutId
    
    const handleActivity = () => {
      setIsIdle(false)
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => setIsIdle(true), timeout)
    }
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })
    
    timeoutId = setTimeout(() => setIsIdle(true), timeout)
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
      clearTimeout(timeoutId)
    }
  }, [timeout])
  
  return isIdle
}

// Measure hook
export const useMeasure = () => {
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    x: 0,
    y: 0,
    right: 0,
    bottom: 0
  })
  
  const ref = useRef()
  
  useEffect(() => {
    const measure = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect()
        setDimensions(rect)
      }
    }
    
    measure()
    
    const resizeObserver = new ResizeObserver(measure)
    
    if (ref.current) {
      resizeObserver.observe(ref.current)
    }
    
    return () => {
      resizeObserver.disconnect()
    }
  }, [])
  
  return [ref, dimensions]
}

// Intersection observer hook
export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [entry, setEntry] = useState(null)
  
  const ref = useRef()
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
        setEntry(entry)
      },
      options
    )
    
    if (ref.current) {
      observer.observe(ref.current)
    }
    
    return () => {
      observer.disconnect()
    }
  }, [options])
  
  return [ref, isIntersecting, entry]
}

// Permission hook
export const usePermission = (name) => {
  const [state, setState] = useState('prompt')
  
  useEffect(() => {
    if (!navigator.permissions) {
      setState('unsupported')
      return
    }
    
    navigator.permissions.query({ name }).then((permission) => {
      setState(permission.state)
      
      const handleChange = () => setState(permission.state)
      permission.addEventListener('change', handleChange)
      
      return () => {
        permission.removeEventListener('change', handleChange)
      }
    })
  }, [name])
  
  return state
}