import * as React from "react"
import { Label } from "./label"

interface FieldProps {
  label: string
  children: React.ReactNode
  className?: string
  helper?: string
}

export function Field({ label, children, className, helper }: FieldProps) {
  return (
    <div className={`space-y-2 ${className || ""}`}>
      <Label>{label}</Label>
      {children}
      {helper && <p className="text-[0.8rem] text-muted-foreground">{helper}</p>}
    </div>
  )
}
