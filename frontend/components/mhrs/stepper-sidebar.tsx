"use client"

import { cn } from '@/lib/utils'

interface Step {
  number: number
  label: string
  active: boolean
  completed: boolean
}

interface StepperSidebarProps {
  steps: Step[]
  duration?: number
}

export function StepperSidebar({ steps, duration = 3 }: StepperSidebarProps) {
  return (
    <aside className="w-48 bg-card border-r border-border p-4 shrink-0">
      <p className="text-xs text-muted-foreground text-center mb-6 leading-relaxed">
        Bu islem yaklasik <span className="font-bold text-foreground">{duration}</span> dakika surmektedir.
      </p>

      <div className="relative">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-start gap-3 relative">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'size-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors',
                  step.active
                    ? 'bg-primary text-primary-foreground'
                    : step.completed
                      ? 'bg-primary/80 text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                {step.number}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-0.5 h-16',
                    step.completed ? 'bg-primary/40' : 'bg-border'
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                'text-sm mt-1.5',
                step.active
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground'
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </aside>
  )
}
