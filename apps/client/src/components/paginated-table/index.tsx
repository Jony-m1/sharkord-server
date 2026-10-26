import { Button, Input } from '@sharkord/ui';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type TPaginatedTableProps<T> = {
  items: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  searchFilter: (item: T, searchTerm: string) => boolean;
  headerColumns: React.ReactNode;
  gridCols: string;
  getItemKey?: (item: T) => string | number;
  itemsPerPage?: number;
  searchPlaceholder?: string;
  emptyMessage?: string;
  toolbar?: React.ReactNode;
  pageResetKey?: string | number;
};

const MAX_VISIBLE_PAGES = 5;

type TPageButtonProps = {
  page: number;
  isCurrent: boolean;
  onSelect: (page: number) => void;
};

const PageButton = memo(({ page, isCurrent, onSelect }: TPageButtonProps) => {
  const handleClick = useCallback(() => {
    onSelect(page);
  }, [onSelect, page]);

  return (
    <Button
      variant={isCurrent ? 'default' : 'outline'}
      size="sm"
      onClick={handleClick}
      className="min-w-8"
    >
      {page}
    </Button>
  );
});

const PaginatedTableComponent = <T,>({
  items,
  renderRow,
  searchFilter,
  headerColumns,
  gridCols,
  getItemKey,
  itemsPerPage = 10,
  searchPlaceholder,
  emptyMessage,
  toolbar,
  pageResetKey
}: TPaginatedTableProps<T>) => {
  const { t } = useTranslation('common');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [seenPageResetKey, setSeenPageResetKey] = useState(pageResetKey);

  // a new key is a different list, such as another filter, so like a new search it starts on its
  // first page. a refetch of the same list keeps the page
  if (pageResetKey !== seenPageResetKey) {
    setSeenPageResetKey(pageResetKey);
    setCurrentPage(1);
  }

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    return items.filter((item) => searchFilter(item, searchTerm));
  }, [items, searchTerm, searchFilter]);

  const totalPages = useMemo(
    () => Math.ceil(filteredItems.length / itemsPerPage),
    [filteredItems, itemsPerPage]
  );

  // the items can shrink under the open page, after a filter or a refetch, so it is kept in range
  const page = Math.min(currentPage, Math.max(totalPages, 1));

  const paginatedItems = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, page, itemsPerPage]);

  const handlePageChange = useCallback(
    (nextPage: number) => {
      if (nextPage >= 1 && nextPage <= totalPages) {
        setCurrentPage(nextPage);
      }
    },
    [totalPages]
  );

  const handlePrevious = useCallback(() => {
    handlePageChange(page - 1);
  }, [handlePageChange, page]);

  const handleNext = useCallback(() => {
    handlePageChange(page + 1);
  }, [handlePageChange, page]);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(event.target.value);
      setCurrentPage(1);
    },
    []
  );

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];

    if (totalPages <= MAX_VISIBLE_PAGES) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }

      return pages;
    }

    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, startPage + MAX_VISIBLE_PAGES - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }, [page, totalPages]);

  let emptyText = emptyMessage ?? t('tableEmpty');

  if (searchTerm.trim()) {
    emptyText = t('tableNoMatches', { term: searchTerm });
  }

  let summary = t('tableEmpty');

  if (filteredItems.length > 0) {
    summary = t('tableShowing', {
      from: (page - 1) * itemsPerPage + 1,
      to: Math.min(page * itemsPerPage, filteredItems.length),
      total: filteredItems.length
    });
  }

  return (
    <div className="space-y-4">
      {toolbar}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder ?? t('tableSearchPlaceholder')}
          value={searchTerm}
          onChange={handleSearchChange}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border">
        <div
          className={`grid ${gridCols} gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium text-muted-foreground`}
        >
          {headerColumns}
        </div>

        <div className="divide-y">
          {paginatedItems.length === 0 && (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              {emptyText}
            </div>
          )}
          {paginatedItems.map((item, index) => (
            <div key={getItemKey ? getItemKey(item) : index}>
              {renderRow(item, (page - 1) * itemsPerPage + index)}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">{summary}</div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {pageNumbers.map((pageNumber) => (
              <PageButton
                key={pageNumber}
                page={pageNumber}
                isCurrent={page === pageNumber}
                onSelect={handlePageChange}
              />
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const PaginatedTable = memo(PaginatedTableComponent) as <T>(
  props: TPaginatedTableProps<T>
) => React.ReactElement;

export { PaginatedTable };
