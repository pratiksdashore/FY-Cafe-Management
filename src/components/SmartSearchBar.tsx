import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Clock } from 'lucide-react';
import { useSearchMenu } from '@/hooks/useMenu';
import { MenuItem } from '@/types/food';
import { cn } from '@/lib/utils';

interface SmartSearchBarProps {
    vendorId?: string;
    /** Pass the already-loaded menu items for instant local filtering */
    menuItems?: MenuItem[];
    onSelectItem?: (item: MenuItem) => void;
    /** Called whenever the query text changes, so parent can filter the grid */
    onSearchChange?: (query: string) => void;
    placeholder?: string;
    className?: string;
}

/** Highlights the matched portion of a text string */
const Highlighted = ({ text, query }: { text: string; query: string }) => {
    if (!query) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return (
        <>
            {text.slice(0, idx)}
            <mark className="bg-primary/20 text-primary rounded-sm font-semibold not-italic">
                {text.slice(idx, idx + query.length)}
            </mark>
            {text.slice(idx + query.length)}
        </>
    );
};

export const SmartSearchBar = ({
    vendorId,
    menuItems,
    onSelectItem,
    onSearchChange,
    placeholder = 'Search for dishes...',
    className,
}: SmartSearchBarProps) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const { results: dbResults, loading, search: dbSearch } = useSearchMenu();
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Load search history from localStorage
    useEffect(() => {
        const history = localStorage.getItem('search_history');
        if (history) setSearchHistory(JSON.parse(history));
    }, []);

    // Local filtering from passed-in menuItems (instant, no network)
    const localResults: MenuItem[] = menuItems && query.length >= 2
        ? menuItems.filter((item) =>
            item.name.toLowerCase().includes(query.toLowerCase()) ||
            item.description?.toLowerCase().includes(query.toLowerCase()) ||
            item.tags?.some((t) => t.toLowerCase().includes(query.toLowerCase()))
        ).slice(0, 10)
        : [];

    // Use local results if menuItems provided, otherwise fall back to DB results
    const results = menuItems ? localResults : dbResults;

    // Debounced DB search (only when menuItems not provided)
    useEffect(() => {
        if (menuItems) return; // skip if using local filtering
        const debounce = setTimeout(() => {
            if (query.length >= 2) {
                dbSearch(query);
                setIsOpen(true);
            } else {
                setIsOpen(false);
            }
        }, 300);
        return () => clearTimeout(debounce);
    }, [query, vendorId, menuItems]);

    // Open dropdown when local results appear
    useEffect(() => {
        if (menuItems) {
            setIsOpen(query.length >= 2);
        }
    }, [localResults.length, query, menuItems]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex((prev) => Math.max(prev - 1, -1));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (selectedIndex >= 0 && results[selectedIndex]) {
                        handleSelectItem(results[selectedIndex]);
                    }
                    break;
                case 'Escape':
                    setIsOpen(false);
                    inputRef.current?.blur();
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, results]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node) &&
                !inputRef.current?.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectItem = useCallback((item: MenuItem) => {
        // Save to search history
        const newHistory = [item.name, ...searchHistory.filter((h) => h !== item.name)].slice(0, 5);
        setSearchHistory(newHistory);
        localStorage.setItem('search_history', JSON.stringify(newHistory));

        // Update the query text so the parent grid also filters
        setQuery(item.name);
        onSearchChange?.(item.name);
        setIsOpen(false);
        setSelectedIndex(-1);
        onSelectItem?.(item);
    }, [searchHistory, onSelectItem, onSearchChange]);

    const handleQueryChange = (value: string) => {
        setQuery(value);
        onSearchChange?.(value);
        setSelectedIndex(-1);
        if (value.length < 2) setIsOpen(false);
    };

    const handleHistoryClick = (historyItem: string) => {
        setQuery(historyItem);
        onSearchChange?.(historyItem);
        inputRef.current?.focus();
    };

    const clearSearch = () => {
        setQuery('');
        onSearchChange?.('');
        setIsOpen(false);
        inputRef.current?.focus();
    };


    return (
        <div className={cn('relative w-full', className)}>
            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    onFocus={() => {
                        if (query.length >= 2) setIsOpen(true);
                        else if (searchHistory.length > 0) setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border-0 bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-sm"
                    autoComplete="off"
                />
                {query && (
                    <button
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div
                    ref={dropdownRef}
                    className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl max-h-80 overflow-y-auto z-50 animate-in fade-in-0 slide-in-from-top-2 duration-150"
                >
                    {/* ── Results ── */}
                    {query.length >= 2 && (loading && !menuItems) ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                            <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                            Searching...
                        </div>
                    ) : query.length >= 2 && results.length > 0 ? (
                        <div className="py-1">
                            <p className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Suggestions
                            </p>
                            {results.map((item, index) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleSelectItem(item)}
                                    className={cn(
                                        'w-full px-4 py-2.5 flex items-center gap-3 hover:bg-muted/60 transition-colors text-left',
                                        selectedIndex === index && 'bg-muted/60'
                                    )}
                                >
                                    {item.image ? (
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-10 h-10 rounded-lg object-cover shrink-0"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                            🍽️
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">
                                            <Highlighted text={item.name} query={query} />
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="text-primary font-bold">
                                                ₹{item.discountPercent && item.discountPercent > 0
                                                    ? Math.round(item.price * (1 - item.discountPercent / 100))
                                                    : item.price}
                                            </span>
                                            {item.discountPercent && item.discountPercent > 0 && (
                                                <span className="text-green-600 font-extrabold">{item.discountPercent}% off</span>
                                            )}
                                            <span>·</span>
                                            <span>{item.category}</span>
                                            {!item.available && (
                                                <span className="text-destructive font-medium">Out of stock</span>
                                            )}
                                        </div>
                                    </div>
                                    {item.isBestSeller && (
                                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0 font-bold">
                                            🔥 BEST
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : query.length >= 2 ? (
                        <div className="p-6 text-center text-muted-foreground">
                            <p className="text-sm mb-1">No results for "<strong>{query}</strong>"</p>
                            <p className="text-xs">Try a different keyword</p>
                        </div>
                    ) : null}

                    {/* ── Search History ── */}
                    {query.length < 2 && searchHistory.length > 0 && (
                        <div className="py-1 border-t border-border/50">
                            <p className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                <Clock className="w-3 h-3" /> Recent
                            </p>
                            {searchHistory.map((item, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleHistoryClick(item)}
                                    className="w-full px-4 py-2 text-left hover:bg-muted/60 transition-colors text-sm flex items-center gap-2"
                                >
                                    <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    {item}
                                </button>
                            ))}
                        </div>
                    )}

                </div>
            )}
        </div>
    );
};
