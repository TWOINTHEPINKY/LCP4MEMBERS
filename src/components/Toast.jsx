import { useEffect } from 'react'

export default function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="toast">
      <span>{message}</span>
      <button onClick={onClose} aria-label="Close notification">×</button>
    </div>
  )
}