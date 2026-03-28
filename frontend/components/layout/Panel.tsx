import { ReactNode } from "react";
import clsx from "clsx";

interface PanelProps {
  label?: string;
  labelRight?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
  transparent?: boolean;
}

export default function Panel({ label, labelRight, children, className, bodyClass, transparent }: PanelProps) {
  return (
    <div
      className={clsx(
        "flex flex-col overflow-hidden",
        !transparent && "glass-panel",
        className
      )}
      style={{ position: "relative", zIndex: 1 }}
    >
      {label && (
        <div className="panel-label">
          <span>{label}</span>
          {labelRight && <span>{labelRight}</span>}
        </div>
      )}
      <div className={clsx("flex-1 overflow-hidden flex flex-col gap-2.5 p-3.5", bodyClass)}>
        {children}
      </div>
    </div>
  );
}
