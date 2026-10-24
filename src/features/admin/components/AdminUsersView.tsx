import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getAdminUser, getAdminUsers, type AdminUserListItem } from "@/api/admin";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/shared/ui/sheet";
import { Switch } from "@/shared/ui/switch";
import { cn } from "@/shared/utils/utils";

import { formatNumber } from "../adminUtils";
import { AdminUserDetail } from "./AdminUserDetail";
import { AdminUsersTable } from "./AdminUsersTable";

const PAGE_SIZE = 25;

export function AdminUsersView({searchQuery = "", initialSelectedUserId = null}: {searchQuery?: string; initialSelectedUserId?: number | null}) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(initialSelectedUserId);
  const [detailSheetOpen, setDetailSheetOpen] = useState(initialSelectedUserId !== null);
  const [searchValue, setSearchValue] = useState("");
  useEffect(() => { setSearchValue(searchQuery); }, [searchQuery]);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [noSearches, setNoSearches] = useState(false);
  const [hasSmtp, setHasSmtp] = useState(false);
  const [page, setPage] = useState(1);
  const isDesktopDetail = useDesktopDetailLayout();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchValue]);

  const filters = useMemo(
    () => ({
      q: debouncedSearch || undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      include_deleted: includeDeleted,
      no_searches: noSearches,
      has_smtp: hasSmtp,
    }),
    [debouncedSearch, hasSmtp, includeDeleted, noSearches, page],
  );

  const usersQuery = useQuery({
    queryKey: ["admin", "users", filters],
    queryFn: () => getAdminUsers(filters),
  });

  const detailQuery = useQuery({
    queryKey: ["admin", "user", selectedUserId],
    queryFn: () => getAdminUser(selectedUserId as number),
    enabled: selectedUserId !== null,
    retry: false,
  });

  const total = usersQuery.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const users = usersQuery.data?.items || [];

  const selectUser = (user: AdminUserListItem) => {
    setSelectedUserId(user.id);
    if (!isDesktopDetail) {
      setDetailSheetOpen(true);
    }
  };

  useEffect(() => {
    if (isDesktopDetail) {
      setDetailSheetOpen(false);
    }
  }, [isDesktopDetail]);

  const resetPage = (setter: (value: boolean) => void, value: boolean) => {
    setter(value);
    setPage(1);
  };

  return (
    <main className="min-h-0 flex-1 overflow-hidden">
      <div className={cn("grid h-full min-w-0 grid-cols-1", selectedUserId !== null && "xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.55fr)]")}>
        <section className="min-w-0 overflow-y-auto p-4 lg:p-5">
          <div className="admin-card mb-4 p-3">
            <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
              <div className="relative min-w-0 flex-1 2xl:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <Input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Поиск по email или ID"
                  className="admin-field h-9 pl-9 text-white placeholder:text-white/35 focus-visible:ring-primary/30"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
                <FilterSwitch
                  label="Включая удалённых"
                  checked={includeDeleted}
                  onCheckedChange={(value) => resetPage(setIncludeDeleted, value)}
                />
                <FilterSwitch
                  label="Только без поисков"
                  checked={noSearches}
                  onCheckedChange={(value) => resetPage(setNoSearches, value)}
                />
                <FilterSwitch
                  label="Только с SMTP"
                  checked={hasSmtp}
                  onCheckedChange={(value) => resetPage(setHasSmtp, value)}
                />
              </div>
            </div>

            <div className="mt-3 text-xs text-white/45">Всего: {formatNumber(total)}</div>
          </div>

          {usersQuery.error ? (
            <div className="rounded-md border border-red-400/20 bg-red-500/10 p-5 text-sm text-red-200">
              Не удалось выполнить операцию. Повторите попытку.
            </div>
          ) : (
            <AdminUsersTable
              users={users}
              selectedUserId={selectedUserId}
              loading={usersQuery.isLoading}
              onSelectUser={selectUser}
            />
          )}

          <Pagination
            page={page}
            totalPages={totalPages}
            disabled={usersQuery.isFetching}
            onPageChange={setPage}
          />
        </section>

        {selectedUserId !== null && <section className="hidden min-h-0 min-w-0 border-l border-[var(--admin-border)] p-4 xl:block">
          <AdminUserDetail
            user={detailQuery.data}
            loading={detailQuery.isLoading}
            error={!!detailQuery.error}
            onClose={() => setSelectedUserId(null)}
          />
        </section>}
      </div>

      <Sheet open={!isDesktopDetail && detailSheetOpen && selectedUserId !== null} onOpenChange={open=>{setDetailSheetOpen(open);if(!open)setSelectedUserId(null);}}>
        <SheetContent side="right" className="w-full border-white/10 bg-background p-0 sm:max-w-2xl xl:hidden">
          <SheetTitle className="sr-only">Пользователь</SheetTitle>
          <AdminUserDetail
            user={detailQuery.data}
            loading={detailQuery.isLoading}
            error={!!detailQuery.error}
            onClose={() => {
              setDetailSheetOpen(false);
              setSelectedUserId(null);
            }}
          />
        </SheetContent>
      </Sheet>
    </main>
  );
}

function useDesktopDetailLayout(): boolean {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 1280px)").matches,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(min-width: 1280px)");
    const handleChange = () => setIsDesktop(media.matches);

    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return isDesktop;
}

function FilterSwitch({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <Switch checked={checked} onCheckedChange={onCheckedChange} className="h-5 w-9 data-[state=checked]:bg-primary" />
      <span>{label}</span>
    </label>
  );
}

function Pagination({
  page,
  totalPages,
  disabled,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  disabled: boolean;
  onPageChange: (page: number) => void;
}) {
  const pages = paginationPages(page, totalPages);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={disabled || page <= 1}
        className="h-8 w-8 border-white/10 bg-card text-white hover:border-primary hover:bg-primary hover:text-primary-foreground"
        aria-label="Предыдущая страница"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pages.map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className="px-1 text-xs text-white/35">
            ...
          </span>
        ) : (
          <Button
            key={item}
            variant="outline"
            size="sm"
            onClick={() => onPageChange(item)}
            disabled={disabled}
            className={cn(
              "h-8 min-w-8 border-white/10 bg-card px-2 text-white hover:border-primary hover:bg-primary hover:text-primary-foreground",
              page === item && "border-primary bg-primary text-primary-foreground",
            )}
          >
            {item}
          </Button>
        ),
      )}

      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={disabled || page >= totalPages}
        className="h-8 w-8 border-white/10 bg-card text-white hover:border-primary hover:bg-primary hover:text-primary-foreground"
        aria-label="Следующая страница"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function paginationPages(page: number, totalPages: number): Array<number | "gap"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, page, page - 1, page + 1].filter((item) => item >= 1 && item <= totalPages));
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: Array<number | "gap"> = [];

  sorted.forEach((item, index) => {
    const previous = sorted[index - 1];
    if (previous && item - previous > 1) {
      result.push("gap");
    }
    result.push(item);
  });

  return result;
}
