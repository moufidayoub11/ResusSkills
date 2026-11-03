"use client";
import { createContext, useContext, type ReactNode } from "react";
import {
  Button as BeButton,
  type ButtonProps,
} from "@/components/motion/button/base";
import { Input } from "@/components/motion/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/motion/select";
import {
  CenterMorphModal,
  CenterMorphModalContent,
} from "@/components/motion/center-morph-modal";
import { LoaderCircle, AlertCircle } from "lucide-react";
export { Input };
export function Button({
  children,
  pending,
  ...props
}: ButtonProps & { pending?: boolean }) {
  return (
    <BeButton
      pressScale={0.99}
      {...props}
      disabled={props.disabled || pending}
      className={`p-button ${props.className ?? ""}`}
      aria-busy={pending}
    >
      {pending && <LoaderCircle className="p-spin" size={16} />} {children}
    </BeButton>
  );
}
export function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="p-field">
      <span className="p-field-label">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="p-select">
          <span className="sr-only">{label} : </span>
          <SelectValue placeholder="Tous" />
        </SelectTrigger>
        <SelectContent className="p-select-content">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
export function Dialog({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <CenterMorphModal open={open} onOpenChange={(v) => !v && onClose()}>
      <CenterMorphModalContent
        ariaLabel={title}
        closeButtonLabel="Fermer"
        className={`p-dialog ${wide ? "p-dialog-wide" : ""}`}
      >
        <h2>{title}</h2>
        {children}
      </CenterMorphModalContent>
    </CenterMorphModal>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`p-notice ${error ? "p-error" : ""}`}
      role={error ? "alert" : "status"}
    >
      <AlertCircle size={17} />
      <div>{children}</div>
    </div>
  );
}
export const FeedbackContext = createContext<
  (message: string, error?: boolean) => void
>(() => {});
export const useFeedback = () => useContext(FeedbackContext);
export function Empty({
  title = "Aucun résultat",
  description = "Essayez une autre période ou retirez certains filtres.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="p-empty">
      <div className="p-empty-icon">
        <AlertCircle size={24} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
