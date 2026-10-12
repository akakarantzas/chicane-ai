import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'

export default function DriverDropdown({ value, onChange, options, label }) {
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const listboxId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const selectedIndex = Math.max(options.findIndex((driver) => driver.abbrev === value), 0)
  const selected = options[selectedIndex]
  const [activeIndex, setActiveIndex] = useState(selectedIndex)

  useEffect(() => {
    setActiveIndex(selectedIndex)
  }, [selectedIndex])

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event) => {
      if (buttonRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return
      setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  function chooseDriver(index) {
    const driver = options[index]
    if (!driver) return
    onChange(driver.abbrev)
    setIsOpen(false)
    requestAnimationFrame(() => buttonRef.current?.focus())
  }

  function focusOption(index) {
    const boundedIndex = (index + options.length) % options.length
    setActiveIndex(boundedIndex)
    requestAnimationFrame(() => {
      menuRef.current?.querySelector(`[data-option-index="${boundedIndex}"]`)?.scrollIntoView({ block: 'nearest' })
    })
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIsOpen(true)
      focusOption(activeIndex + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setIsOpen(true)
      focusOption(activeIndex - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setIsOpen(true)
      focusOption(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setIsOpen(true)
      focusOption(options.length - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (isOpen) chooseDriver(activeIndex)
      else setIsOpen(true)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setIsOpen(false)
      buttonRef.current?.focus()
    }
  }

  return (
    <div className="h2h-driver-dropdown" onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        className="h2h-driver-dropdown-button"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="h2h-driver-dropdown-copy">
          <span className="h2h-driver-dropdown-name">{selected.fullName}</span>
          <span className="h2h-driver-dropdown-team">{selected.team}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h2h-driver-dropdown-chevron ${isOpen ? 'h2h-driver-dropdown-chevron-open' : ''}`}
          size={20}
          strokeWidth={2.2}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-label={label}
            aria-activedescendant={`${listboxId}-option-${activeIndex}`}
            className="h2h-driver-dropdown-menu"
            initial={{ opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.985 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {options.map((driver, index) => {
              const isSelected = driver.abbrev === value
              const isActive = index === activeIndex

              return (
                <button
                  key={driver.abbrev}
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-option-index={index}
                  className={`h2h-driver-dropdown-option ${isSelected ? 'h2h-driver-dropdown-option-selected' : ''} ${isActive ? 'h2h-driver-dropdown-option-active' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => chooseDriver(index)}
                >
                  <span className="h2h-driver-dropdown-option-main">
                    <span className="h2h-driver-dropdown-option-name">{driver.fullName}</span>
                    <span className="h2h-driver-dropdown-option-team">{driver.team}</span>
                  </span>
                  {isSelected && <Check aria-hidden="true" size={17} strokeWidth={2.4} className="h2h-driver-dropdown-check" />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
