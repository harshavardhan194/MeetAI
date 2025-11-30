import { ReactNode, useState } from "react";
import { ChevronsUpDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import {
    CommandEmpty,
    CommandInput,
    CommandItem,
    CommandList,
    CommandResponsiveDialog
} from '@/components/ui/command';

interface Props {
    options: Array<{
        id: string;
        value: string;
        children: ReactNode;
    }>;
    onSelect: (value: string) => void;
    onSearch?: (value: string) => void;
    value: string;
    placeholder?: string;
    isSearchable?: boolean;
    className?: string;
    emptyAction?: {
        label: string;
        onClick: () => void;
    };
};

export const CommandSelect = ({
    options,
    onSelect,
    onSearch,
    value,
    placeholder,
    className,
    emptyAction,
}: Props) => {
    const [open, setOpen] = useState(false);
    const selectedOption = options.find((option) => option.value === value);

    const handleOpenChange = (value: boolean) => { 
        onSearch?.("");  
        setOpen(value);
    };

    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                type="button"
                variant="outline"
                className={cn(
                    "h-9 justify-between font-normal px-2",
                    !selectedOption && "text-muted-foreground",
                    className,
                )}
            >
                <div>
                    {selectedOption?.children ?? placeholder}
                </div>
                <ChevronsUpDownIcon />
            </Button >
            <CommandResponsiveDialog
                shouldFilter={!onSearch}
                open={open}
                onOpenChange={handleOpenChange}
            >
                <CommandInput placeholder="Search..." onValueChange={onSearch} />
                <CommandList>
                    <CommandEmpty>
                        {emptyAction ? (
                            <div className="flex flex-col items-center gap-2 py-4">
                                <span className="text-muted-foreground text-sm">
                                    No options found
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        emptyAction.onClick();
                                        setOpen(false);
                                    }}
                                >
                                    {emptyAction.label}
                                </Button>
                            </div>
                        ) : (
                            <span className="text-muted-foreground text-sm">
                                No options found
                            </span>
                        )}
                    </CommandEmpty>
                    {options.map((option) => (
                        <CommandItem
                            key={option.id}
                            onSelect={() => {
                                onSelect(option.value);
                                setOpen(false);
                            }}
                        >
                            {option.children}
                        </CommandItem>
                    ))}
                    {emptyAction && options.length > 0 && (
                        <CommandItem
                            onSelect={() => {
                                emptyAction.onClick();
                                setOpen(false);
                            }}
                            className="border-t mt-2 pt-2"
                        >
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <span>+ {emptyAction.label}</span>
                            </div>
                        </CommandItem>
                    )}
                </CommandList>
            </CommandResponsiveDialog>
        </>
    )
}
