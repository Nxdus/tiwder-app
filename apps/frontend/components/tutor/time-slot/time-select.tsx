"use client";

import { useState, type RefObject } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  timeOptions,
  toMinutes,
  type TimeSelection,
} from "@/lib/tutor/time-slot/schedule";

const periods = [
  { value: "AM", label: "AM" },
  { value: "PM", label: "PM" },
] as const;

export default function TimeSelect({
  label,
  value,
  onChange,
  popupAnchor,
  feedbackId,
  disabled,
  isUnavailable,
}: {
  label: string;
  value: TimeSelection;
  onChange: (value: TimeSelection) => void;
  popupAnchor: RefObject<HTMLDivElement | null>;
  feedbackId?: string;
  disabled: boolean;
  isUnavailable: (value: TimeSelection) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedTime =
    timeOptions.find((time) => time.value === value.time)?.label ?? "--:--";

  function selectValue(nextValue: TimeSelection) {
    if (isUnavailable(nextValue)) return;
    onChange(nextValue);
    if (toMinutes(nextValue) !== null) setOpen(false);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <label
        htmlFor={label.replaceAll(" ", "-")}
        className="flex h-[26px] items-center justify-center text-sm font-medium"
      >
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          id={label.replaceAll(" ", "-")}
          aria-label={`Choose ${label.toLowerCase()}`}
          aria-describedby={feedbackId}
          render={
            <Button
              variant="outline"
              className="mx-auto w-full max-w-32 justify-between px-3"
            />
          }
        >
          <span>
            {selectedTime} {value.period ?? "--"}
          </span>
          <ChevronDown className="size-3 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent
          anchor={popupAnchor}
          align="center"
          sideOffset={({ anchor, positioner }) =>
            -(anchor.height + positioner.height) / 2
          }
          className="w-48 gap-2 p-3"
        >
          <PopoverTitle className="text-center text-base font-semibold">
            {label}
          </PopoverTitle>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div
              dir="rtl"
              className="max-h-44 min-w-0 overflow-y-auto [scrollbar-gutter:stable]"
            >
              <div dir="ltr">
                <p className="sticky top-0 z-10 mb-1 bg-popover text-center text-xs text-muted-foreground">
                  Time
                </p>
                <div
                  role="group"
                  aria-label={`${label} time`}
                  className="flex flex-col gap-1 p-1"
                >
                  {timeOptions.map((time) => (
                    <Button
                      key={time.value}
                      size="sm"
                      variant={value.time === time.value ? "default" : "ghost"}
                      aria-pressed={value.time === time.value}
                      disabled={isUnavailable({ ...value, time: time.value })}
                      onClick={() =>
                        selectValue({ ...value, time: time.value })
                      }
                    >
                      {time.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <p className="mb-1 text-center text-xs text-muted-foreground">
                AM / PM
              </p>
              <div
                role="group"
                aria-label={`${label} AM or PM`}
                className="flex flex-col gap-1 p-1"
              >
                {periods.map((period) => (
                  <Button
                    key={period.value}
                    size="sm"
                    variant={
                      value.period === period.value ? "default" : "ghost"
                    }
                    aria-pressed={value.period === period.value}
                    disabled={isUnavailable({ ...value, period: period.value })}
                    onClick={() =>
                      selectValue({ ...value, period: period.value })
                    }
                  >
                    {period.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
