"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import * as ToastPrimitive from "@radix-ui/react-toast"

export const ToastProvider = ToastPrimitive.Provider

export const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 right-0 z-50 flex max-h-screen w-full flex-col-reverse p-4 sm:max-w-sm",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitive.Viewport.displayName

export const Toast = ToastPrimitive.Root
export const ToastAction = ToastPrimitive.Action
export const ToastDescription = ToastPrimitive.Description
export const ToastTitle = ToastPrimitive.Title
export const ToastClose = ToastPrimitive.Close
